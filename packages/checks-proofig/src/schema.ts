import { z } from 'zod';

/**
 * Proofig webhook "ready notification" states.
 *
 * We validate against the enumerated table in the Proofig documentation (PDF page 16).
 */
export const ProofigNotifyStateSchema = z.enum([
  'Processing',
  'Awaiting: Sub-Image Approval',
  'Awaiting: Review',
  'Report: Clean',
  'Report: Flagged',
  'Deleted',
]);

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
  'skipped', // Stage was skipped
  'error', // Error occurred
]);

/**
 * Non-linear (final/review) stage statuses.
 *
 * NOTE: This schema is intentionally richer than the linear stages to support iterative review.
 */
export const ReviewStageStatusSchema = z.enum([
  'pending', // Not started yet
  'not-completed', // In progress / awaiting manual action
  'completed', // Review completed (before final report)
  'clean', // Final report indicates no issues
  'flagged', // Final report indicates issues
  'error', // Error occurred
]);

/**
 * Individual Proofig workflow stage schemas.
 */
export const LinearStageSchema = z.object({
  status: LinearStageStatusSchema,
  timestamp: z.string().optional(), // ISO timestamp when status was set
  error: z.string().optional(), // Error message if failed
  events: z.array(ProofigNotifyEventSchema).optional(), // Notify payload history for this stage
});

export const ReviewStageSchema = z.object({
  status: ReviewStageStatusSchema,
  timestamp: z.string().optional(), // ISO timestamp when status was set
  error: z.string().optional(), // Error message if failed
  events: z.array(ProofigNotifyEventSchema).optional(), // Notify payload history for this stage
});

export const ProofigSummarySchema = z.object({
  state: ProofigNotifyStateSchema,
  subimagesTotal: z.number().int().nonnegative(),
  matchesReview: z.number().int().nonnegative(),
  matchesReport: z.number().int().nonnegative(),
  inspectsReport: z.number().int().nonnegative(),
  reportUrl: z.string(),
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
    initialPost: LinearStageSchema.default({ status: 'pending', events: [] }),
    subimageDetection: LinearStageSchema.default({ status: 'pending', events: [] }),
    subimageSelection: LinearStageSchema.default({ status: 'pending', events: [] }),
    integrityDetection: LinearStageSchema.default({ status: 'pending', events: [] }),
    resultsReview: ReviewStageSchema.default({ status: 'pending', events: [] }),
    finalReport: ReviewStageSchema.default({ status: 'pending', events: [] }),
  }),
});

export type ProofigStageStatus = z.infer<typeof LinearStageStatusSchema>;
export type ProofigStage = z.infer<typeof LinearStageSchema>;
export type ProofigReviewStage = z.infer<typeof ReviewStageSchema>;
export type ProofigDataSchema = z.infer<typeof proofigDataSchema>;

export type ProofigStages = ProofigDataSchema['stages'];

// Default stages structure (used defensively in UI)
export const DEFAULT_STAGES: ProofigStages = {
  initialPost: { status: 'pending', events: [] },
  subimageDetection: { status: 'pending', events: [] },
  subimageSelection: { status: 'pending', events: [] },
  integrityDetection: { status: 'pending', events: [] },
  resultsReview: { status: 'pending', events: [] },
  finalReport: { status: 'pending', events: [] },
};

export const STAGE_ORDER: (keyof ProofigStages)[] = [
  'initialPost',
  'subimageDetection',
  'subimageSelection',
  'integrityDetection',
  'resultsReview',
  'finalReport',
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
      if (stageStatus === 'pending' || stageStatus === 'not-completed' || stageStatus === 'error') {
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

/**
 * Initializes all Proofig stages with default 'pending' status if they don't exist.
 */
export function ensureProofigStages(proofigStatus: ProofigDataSchema) {
  if (!proofigStatus.stages) {
    const now = new Date().toISOString();
    return {
      ...proofigStatus,
      stages: {
        initialPost: { status: 'pending', timestamp: now, events: [] },
        subimageDetection: { status: 'pending', timestamp: now, events: [] },
        subimageSelection: { status: 'pending', timestamp: now, events: [] },
        integrityDetection: { status: 'pending', timestamp: now, events: [] },
        resultsReview: { status: 'pending', timestamp: now, events: [] },
        finalReport: { status: 'pending', timestamp: now, events: [] },
      },
    } satisfies ProofigDataSchema;
  }
  return proofigStatus;
}
