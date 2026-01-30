import { DEFAULT_STAGES, ensureProofigStages, type ProofigDataSchema, type ProofigNotifyPayload } from '../../schema.js';
import type { ProofigStages } from '../../schema.js';

function pushStageEvent<TStage extends { events?: any[] }>(
  stage: TStage,
  event: { receivedAt: string; payload: ProofigNotifyPayload },
) {
  const currentEvents = stage.events ?? [];
  return {
    ...stage,
    events: [...currentEvents, event],
  };
}

function setLinearStage(
  stages: ProofigStages,
  key: 'initialPost' | 'subimageDetection' | 'subimageSelection' | 'integrityDetection',
  status: ProofigStages[typeof key]['status'],
  timestamp: string,
) {
  return {
    ...stages,
    [key]: {
      ...(stages[key] as any),
      status,
      timestamp,
    },
  } as ProofigStages;
}

function setReviewStage(
  stages: ProofigStages,
  key: 'resultsReview' | 'finalReport',
  status: ProofigStages[typeof key]['status'],
  timestamp: string,
) {
  return {
    ...stages,
    [key]: {
      ...(stages[key] as any),
      status,
      timestamp,
    },
  } as ProofigStages;
}

/**
 * Pure transition function for mapping Proofig notify payloads onto our `serviceData`.
 * Exported for unit testing.
 */
export function applyProofigNotifyToServiceData(
  current: ProofigDataSchema | undefined,
  payload: ProofigNotifyPayload,
  receivedAt: string = new Date().toISOString(),
): ProofigDataSchema {
  const base = current ? ensureProofigStages(current) : ensureProofigStages({ stages: DEFAULT_STAGES });
  const event = { receivedAt, payload };

  // Update summary/top-level fields
  const next: ProofigDataSchema = {
    ...base,
    reportId: payload.report_id,
    reportUrl: payload.report_url,
    deleted: payload.state === 'Deleted' ? true : base.deleted,
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

  // Ensure we have a full stage object (defensive)
  let stages: ProofigStages = {
    ...DEFAULT_STAGES,
    ...(next.stages as any),
  } as ProofigStages;

  const currentLinear = {
    initialPost: stages.initialPost.status,
    subimageDetection: stages.subimageDetection.status,
    subimageSelection: stages.subimageSelection.status,
    integrityDetection: stages.integrityDetection.status,
  };

  switch (payload.state) {
    case 'Processing': {
      // If we've already moved past subimage selection, "Processing" should map to integrity detection.
      // Otherwise, once the initial post is completed, processing indicates subimage detection.
      const shouldBeIntegrity =
        currentLinear.integrityDetection !== 'completed' && currentLinear.subimageSelection === 'completed';

      if (shouldBeIntegrity) {
        stages = setLinearStage(stages, 'integrityDetection', 'processing', receivedAt);
        stages.integrityDetection = pushStageEvent(stages.integrityDetection as any, event) as any;
      } else if (currentLinear.initialPost === 'completed') {
        stages = setLinearStage(stages, 'subimageDetection', 'processing', receivedAt);
        stages.subimageDetection = pushStageEvent(stages.subimageDetection as any, event) as any;
      } else {
        stages = setLinearStage(stages, 'initialPost', 'processing', receivedAt);
        stages.initialPost = pushStageEvent(stages.initialPost as any, event) as any;
      }
      break;
    }

    case 'Awaiting: Sub-Image Approval': {
      // Sub-image detection is finished; awaiting user selection/approval.
      stages = setLinearStage(stages, 'subimageDetection', 'completed', receivedAt);
      stages = setLinearStage(stages, 'subimageSelection', 'pending', receivedAt);
      stages.subimageSelection = pushStageEvent(stages.subimageSelection as any, event) as any;
      break;
    }

    case 'Awaiting: Review': {
      // Integrity detection has finished; awaiting results review.
      const integrityWasCompleted = stages.integrityDetection.status === 'completed';
      stages = setLinearStage(stages, 'integrityDetection', 'completed', receivedAt);

      const rrStatus = stages.resultsReview.status;
      let nextRRStatus: typeof rrStatus;

      if (!integrityWasCompleted) {
        // First time we reach review: mark as pending.
        nextRRStatus = 'pending' as any;
      } else if (rrStatus === 'pending') {
        // If we receive Awaiting: Review again while pending, move to not-completed.
        nextRRStatus = 'not-completed' as any;
      } else if (rrStatus === 'completed' || rrStatus === 'clean' || rrStatus === 'flagged') {
        // Re-review: always ensure we're back in a non-completed state.
        nextRRStatus = 'not-completed' as any;
      } else {
        nextRRStatus = rrStatus;
      }

      stages = setReviewStage(stages, 'resultsReview', nextRRStatus as any, receivedAt);

      // Re-review implies final report is no longer final.
      if (stages.finalReport.status === 'clean' || stages.finalReport.status === 'flagged') {
        stages = setReviewStage(stages, 'finalReport', 'pending', receivedAt);
      }

      stages.resultsReview = pushStageEvent(stages.resultsReview as any, event) as any;
      break;
    }

    case 'Report: Clean': {
      stages = setReviewStage(stages, 'resultsReview', 'completed', receivedAt);
      stages = setReviewStage(stages, 'finalReport', 'clean', receivedAt);
      stages.finalReport = pushStageEvent(stages.finalReport as any, event) as any;
      break;
    }

    case 'Report: Flagged': {
      stages = setReviewStage(stages, 'resultsReview', 'completed', receivedAt);
      stages = setReviewStage(stages, 'finalReport', 'flagged', receivedAt);
      stages.finalReport = pushStageEvent(stages.finalReport as any, event) as any;
      break;
    }

    case 'Deleted': {
      // Mark deleted; keep stages as-is but record the event on the final stage for history.
      stages.finalReport = pushStageEvent(stages.finalReport as any, event) as any;
      break;
    }
  }

  return {
    ...next,
    stages,
  };
}

