import type {
  ProofigStages,
  ProofigDataSchema,
  ProofigNotifyPayload,
  ProofigStageStatus,
  ProofigOutcome,
  ProofigReviewStageStatus,
} from '../../schema.js';

import { KNOWN_STATES, KnownState, MINIMAL_PROOFIG_SERVICE_DATA } from '../../schema.js';
const HISTORY_LIMIT = 20;

function setLinearStage(
  stages: ProofigStages,
  key: 'initialPost' | 'subimageDetection' | 'subimageSelection' | 'integrityDetection',
  status: ProofigStageStatus,
  receivedAt: string,
) {
  const prev = stages[key];
  const prevStatus = prev?.status;
  const prevTimestamp = prev?.timestamp;
  const historyEntry =
    prevStatus != null && prevTimestamp != null
      ? { status: prevStatus, timestamp: prevTimestamp }
      : null;
  const history = [...(historyEntry ? [historyEntry] : []), ...(stages[key]?.history ?? [])].slice(
    0,
    HISTORY_LIMIT,
  );

  return {
    ...stages,
    [key]: {
      ...(stages[key] as any),
      status,
      timestamp: receivedAt,
      history,
    },
  } as ProofigStages;
}

function setReviewStage(
  stages: ProofigStages,
  key: 'resultsReview',
  status: ProofigReviewStageStatus,
  outcome: ProofigOutcome,
  receivedAt: string,
) {
  const prev = stages[key] as
    | {
        status?: ProofigReviewStageStatus;
        outcome?: ProofigOutcome;
        timestamp?: string;
        history?: unknown[];
      }
    | undefined;
  const prevStatus = prev?.status;
  const prevOutcome = prev?.outcome ?? 'pending';
  const prevTimestamp = prev?.timestamp;
  const historyEntry =
    prevStatus != null && prevTimestamp != null
      ? { status: prevStatus, outcome: prevOutcome, timestamp: prevTimestamp }
      : null;
  const history = [...(historyEntry ? [historyEntry] : []), ...(stages[key]?.history ?? [])].slice(
    0,
    HISTORY_LIMIT,
  );

  return {
    ...stages,
    [key]: {
      ...(stages[key] as any),
      status,
      outcome,
      timestamp: receivedAt,
      history,
    },
  } as ProofigStages;
}

/**
 * Pure transition function for mapping Proofig notify payloads onto our `serviceData`.
 * Exported for unit testing.
 */
export function updateStagesAndServiceDataFromValidatedNotifyPayload(
  current: ProofigDataSchema,
  payload: ProofigNotifyPayload,
  receivedAt: string = new Date().toISOString(),
): ProofigDataSchema | null {
  // Ensure we have a full stage object for logic to work (defensive)
  let { stages } = current;
  if (!stages) {
    current = MINIMAL_PROOFIG_SERVICE_DATA;
    stages = current.stages;
  }

  const currentStatuses = {
    initialPost: stages.initialPost?.status,
    subimageDetection: stages.subimageDetection?.status,
    subimageSelection: stages.subimageSelection?.status,
    integrityDetection: stages.integrityDetection?.status,
    resultsReview: stages.resultsReview?.status,
  };

  // defenively check for known states, and if we don't know the state, we ignore the notification.
  if (!KNOWN_STATES.includes(payload.state)) {
    console.warn(
      `[checks-proofig] Unknown state received: ${payload.state}, ignoring notification.`,
    );
    return current;
  }

  if (payload.state === KnownState.Deleted) {
    return {
      ...current,
      deleted: true,
    };
  }

  let updateStages: ProofigStages | null = null;
  switch (payload.state) {
    case KnownState.Processing: {
      // If we receive Processing before subimage detection is completed, we assume that it is subimage detection in progress.
      // Else, if we receive Processing after subimage detection is completed, but before integrityDetection is completed, we assume that it is integrity detection in progress.
      // Otherwise, we ignore the processing notification.
      if (currentStatuses.subimageSelection === 'pending') {
        updateStages = setLinearStage(stages, 'subimageSelection', 'completed', receivedAt);
        updateStages = setLinearStage(updateStages, 'integrityDetection', 'processing', receivedAt);
      } else if (
        currentStatuses.initialPost === 'pending' ||
        currentStatuses.initialPost === 'completed'
      ) {
        updateStages = setLinearStage(stages, 'initialPost', 'completed', receivedAt);
        updateStages = setLinearStage(updateStages, 'subimageDetection', 'processing', receivedAt);
      } else {
        console.warn(
          `[checks-proofig] Processing state received when not expected, ignoring notification.`,
        );
      }
      break;
    }

    case KnownState.AwaitingSubImageApproval: {
      // Sub-image detection is finished; awaiting user selection/approval.
      if (currentStatuses.subimageDetection === 'processing') {
        updateStages = setLinearStage(stages, 'subimageDetection', 'completed', receivedAt);
        updateStages = setLinearStage(updateStages, 'subimageSelection', 'pending', receivedAt);
      } else {
        console.warn(
          `[checks-proofig] Awaiting: Sub-Image Approval state received when not expected, ignoring notification.`,
        );
      }
      break;
    }

    case KnownState.AwaitingReview: {
      // Integrity detection has finished; awaiting results review.
      if (currentStatuses.integrityDetection === 'processing') {
        updateStages = setLinearStage(stages, 'integrityDetection', 'completed', receivedAt);
        updateStages = setReviewStage(
          updateStages,
          'resultsReview',
          'requested',
          'pending',
          receivedAt,
        );
      } else {
        console.warn(
          `[checks-proofig] Awaiting: Review state received when not expected, ignoring notification.`,
        );
      }
      break;
    }

    case KnownState.ReportClean: {
      // We transitioned here from Processing, meaning the detection algorihtm did not flag any issues.
      if (currentStatuses.integrityDetection === 'processing') {
        updateStages = setLinearStage(stages, 'integrityDetection', 'completed', receivedAt);
        updateStages = setReviewStage(
          updateStages,
          'resultsReview',
          'not-requested',
          'clean',
          receivedAt,
        );
      } else if (currentStatuses.integrityDetection === 'completed') {
        updateStages = setReviewStage(stages, 'resultsReview', 'completed', 'clean', receivedAt);
      } else {
        console.warn(
          `[checks-proofig] Report: Clean state received when not expected, ignoring notification.`,
        );
        console.warn(JSON.stringify(current, null, 2));
      }
      break;
    }

    case KnownState.ReportFlagged: {
      if (currentStatuses.integrityDetection === 'processing') {
        // transitioning from this state is unexpected, but we will handle it
        updateStages = setReviewStage(
          stages,
          'resultsReview',
          'not-requested',
          'flagged',
          receivedAt,
        );
      } else if (currentStatuses.integrityDetection === 'completed') {
        updateStages = setReviewStage(stages, 'resultsReview', 'completed', 'flagged', receivedAt);
      } else {
        console.warn(
          `[checks-proofig] Report: Flagged state received when not expected, ignoring notification.`,
        );
        console.warn(JSON.stringify(current, null, 2));
      }
      break;
    }
  }

  if (!updateStages) return null;

  // Update summary/top-level fields
  const next: ProofigDataSchema = {
    ...current,
    stages: updateStages,
    reportId: payload.report_id,
    reportUrl: payload.report_url,
    summary: {
      state: payload.state,
      subimagesTotal: payload.subimages_total,
      matchesReview: payload.matches_review,
      matchesReport: payload.matches_report,
      inspectsReport: payload.inspects_report,
      reportUrl: payload.report_url,
      number: payload.number,
      message: payload.message,
      submitReqId: payload.submit_req_id || undefined,
      receivedAt,
    },
  };

  return next;
}
