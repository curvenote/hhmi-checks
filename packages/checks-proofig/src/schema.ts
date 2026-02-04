import { z } from 'zod';

/**
 * Proofig webhook "ready notification" states.
 *
 * We validate against the enumerated table in the Proofig documentation (PDF page 16).
 */
export enum KnownState {
  Processing = 'Processing',
  AwaitingSubImageApproval = 'Awaiting: Sub-Image Approval',
  AwaitingReview = 'Awaiting: Review',
  ReportClean = 'Report: Clean',
  ReportFlagged = 'Report: Flagged',
  Deleted = 'Deleted',
}

/** Array of known states for membership checks (e.g. .includes()). */
export const KNOWN_STATES: readonly KnownState[] = Object.values(KnownState);

export const ProofigNotifyStateSchema = z.enum(KnownState);

/**
 * Zod schema for the Proofig notify webhook payload.
 *
 * NOTE: `submit_req_id` may be empty from Proofig's perspective, so we accept an empty string
 * and do not enforce equality with the URL `:id`.
 */
export const ProofigNotifyPayloadSchema = z.object({
  submit_req_id: z.string(),
  report_id: z.string(),
  state: ProofigNotifyStateSchema,
  subimages_total: z.number().int().nonnegative().optional(),
  matches_review: z.number().int().nonnegative().optional(),
  matches_report: z.number().int().nonnegative().optional(),
  inspects_report: z.number().int().nonnegative().optional(),
  report_url: z.string().optional(),
  number: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
});

export type ProofigNotifyPayload = z.infer<typeof ProofigNotifyPayloadSchema>;

export const ProofigNotifyEventSchema = z.object({
  receivedAt: z.string(),
  payload: ProofigNotifyPayloadSchema,
});

/**
 * Proofig workflow stage status.
 */
export const LinearStageStatusSchema = z.enum([
  'pending', // Not started yet
  'processing', // Currently in progress
  'completed', // Successfully completed
  'failed', // Failed with error
  'error', // Error occurred
]);

/**
 * Non-linear (final/review) stage statuses.
 *
 * NOTE: This schema is intentionally richer than the linear stages to support iterative review.
 */
export const ReviewStageStatusSchema = z.enum([
  'pending', // Not started
  'requested', // In progress / awaiting manual action
  'completed', // Review completed (received at least one Report: notification)
  'not-requested', // No review was requested, transitioned stright to clean
  'error', // Error occurred
]);

export const ReportReviewOutcomeSchema = z.enum([
  'pending', // Not started / not requested yet
  'clean', // No issues found
  'flagged', // Issues found
]);

/**
 * Individual Proofig workflow stage schemas.
 */
export const LinearStageSchema = z.object({
  status: LinearStageStatusSchema,
  history: z.array(
    z.object({
      status: LinearStageStatusSchema,
      timestamp: z.string(),
    }),
  ),
  timestamp: z.string(),
  error: z.string().optional(), // Error message if failed
});

export const ReviewStageSchema = z.object({
  status: ReviewStageStatusSchema,
  outcome: ReportReviewOutcomeSchema.optional(),
  history: z.array(
    z.object({
      status: ReviewStageStatusSchema,
      outcome: ReportReviewOutcomeSchema,
      timestamp: z.string(),
    }),
  ),
  timestamp: z.string(),
  error: z.string().optional(), // Error message if failed
  events: z.array(ProofigNotifyEventSchema).optional(), // Notify payload history for this stage
});

export const ProofigSummarySchema = z.object({
  state: ProofigNotifyStateSchema,
  subimagesTotal: z.number().int().nonnegative().optional(),
  matchesReview: z.number().int().nonnegative().optional(),
  matchesReport: z.number().int().nonnegative().optional(),
  inspectsReport: z.number().int().nonnegative().optional(),
  reportUrl: z.string().optional(),
  number: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
  submitReqId: z.string().optional(),
  receivedAt: z.string(),
});

/**
 * Proofig-specific status tracking schema.
 * Tracks the 6-stage Proofig workflow plus a denormalized `summary`.
 */
export const proofigDataSchema = z.object({
  reportId: z.string().optional(), // Proofig report ID from initial POST / notifications
  reportUrl: z.string().optional(), // Latest Proofig UI URL from notifications
  deleted: z.boolean().optional(), // Set true if Proofig sends Deleted
  summary: ProofigSummarySchema.optional(),
  stages: z.object({
    initialPost: LinearStageSchema,
    subimageDetection: LinearStageSchema.optional(),
    subimageSelection: LinearStageSchema.optional(),
    integrityDetection: LinearStageSchema.optional(),
    resultsReview: ReviewStageSchema.optional(),
  }),
});

export type ProofigStageStatus = z.infer<typeof LinearStageStatusSchema>;
export type ProofigStage = z.infer<typeof LinearStageSchema>;
export type ProofigReviewStage = z.infer<typeof ReviewStageSchema>;
export type ProofigReviewStageStatus = z.infer<typeof ReviewStageStatusSchema>;
export type ProofigOutcome = z.infer<typeof ReportReviewOutcomeSchema>;
export type ProofigDataSchema = z.infer<typeof proofigDataSchema>;
export type ProofigNotifyState = z.infer<typeof ProofigNotifyStateSchema>;

export type ProofigStages = ProofigDataSchema['stages'];

export const MINIMAL_PROOFIG_SERVICE_DATA: ProofigDataSchema = {
  stages: {
    initialPost: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  },
};

// Default stages structure (used defensively in UI)
export const ALL_PENDING_STAGES: ProofigStages = {
  initialPost: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  subimageDetection: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  subimageSelection: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  integrityDetection: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  resultsReview: { status: 'pending', history: [], timestamp: new Date().toISOString() },
};

export const STAGE_ORDER: (keyof ProofigStages)[] = [
  'initialPost',
  'subimageDetection',
  'subimageSelection',
  'integrityDetection',
  'resultsReview',
];

export function getCurrentProofigStage(stages: ProofigStages) {
  // Find the current active stage
  let currentStageIndex = 0;
  let currentStage: keyof ProofigStages = 'initialPost';
  let currentStageData: ProofigStages[keyof ProofigStages] = stages['initialPost'];

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];
    const stageData = stages[stage];
    const stageStatus = stageData?.status ?? 'pending';

    const isLinearStage =
      stage === 'initialPost' ||
      stage === 'subimageDetection' ||
      stage === 'subimageSelection' ||
      stage === 'integrityDetection';

    if (isLinearStage) {
      if (stageStatus === 'processing' || stageStatus === 'pending' || stageStatus === 'error') {
        currentStageIndex = i;
        currentStage = stage;
        currentStageData = stageData;
        break;
      }

      if (stageStatus === 'failed') {
        currentStageIndex = i;
        currentStage = stage;
        currentStageData = stageData;
        break;
      }
    } else {
      // Review/final stages: pending/not-completed/error are "active"
      if (stageStatus === 'pending' || stageStatus === 'error') {
        currentStageIndex = i;
        currentStage = stage;
        currentStageData = stageData;
        break;
      }
    }

    // If we get here, this stage is "finished" (completed/skipped/clean/flagged/etc).
    // If this was the last stage, keep it as the current stage.
    if (i === STAGE_ORDER.length - 1) {
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
    }
  }

  return { currentStageIndex, currentStage, currentStageData };
}
