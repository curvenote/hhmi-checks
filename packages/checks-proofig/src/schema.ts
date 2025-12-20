import { z } from 'zod';

/**
 * Proofig workflow stage status
 * Each stage can be in one of these states
 */
export const proofigStageStatusSchema = z.enum([
  'pending', // Not started yet
  'processing', // Currently in progress
  'completed', // Successfully completed
  'failed', // Failed with error
  'skipped', // Stage was skipped
]);

/**
 * Individual Proofig workflow stage schema
 */
export const proofigStageSchema = z.object({
  status: proofigStageStatusSchema,
  timestamp: z.string().optional(), // ISO timestamp when status was set
  error: z.string().optional(), // Error message if failed
});

/**
 * Proofig-specific status tracking schema
 * Tracks the 6-stage Proofig workflow
 */
export const proofigDataSchema = z.object({
  dispatched: z.boolean().default(false),
  reportId: z.string().optional(), // Proofig report ID from initial POST
  stages: z.object({
    initialPost: proofigStageSchema.default({ status: 'pending' }),
    subimageDetection: proofigStageSchema.default({ status: 'pending' }),
    subimageSelection: proofigStageSchema.default({ status: 'pending' }),
    integrityDetection: proofigStageSchema.default({ status: 'pending' }),
    resultsReview: proofigStageSchema.default({ status: 'pending' }),
    finalReport: proofigStageSchema.default({ status: 'pending' }),
  }),
});

export type ProofigStageStatus = z.infer<typeof proofigStageStatusSchema>;
export type ProofigStage = z.infer<typeof proofigStageSchema>;
export type ProofigDataSchema = z.infer<typeof proofigDataSchema>;

// Default stages structure
export const DEFAULT_STAGES: ProofigDataSchema['stages'] = {
  initialPost: { status: 'pending' },
  subimageDetection: { status: 'pending' },
  subimageSelection: { status: 'pending' },
  integrityDetection: { status: 'pending' },
  resultsReview: { status: 'pending' },
  finalReport: { status: 'pending' },
};

export const STAGE_ORDER: (keyof typeof DEFAULT_STAGES)[] = [
  'initialPost',
  'subimageDetection',
  'subimageSelection',
  'integrityDetection',
  'resultsReview',
  'finalReport',
];

export function getCurrentProofigStage(stages: ProofigDataSchema['stages']) {
  // Find the current active stage
  let currentStageIndex = 0;
  let currentStage: keyof typeof DEFAULT_STAGES = 'initialPost';
  let currentStageData = stages['initialPost'];

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];
    const stageData = stages[stage];
    const stageStatus = stageData?.status ?? 'pending';

    if (stageStatus === 'processing' || stageStatus === 'pending') {
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
      console.log('currentStage', currentStage);
      break;
    }

    if (stageStatus === 'failed') {
      // Failed at this stage
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
      break;
    }

    if (
      (stageStatus === 'completed' || stageStatus === 'skipped') &&
      i === STAGE_ORDER.length - 1
    ) {
      // All completed or skipped
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
    }
    // If completed or skipped, continue to next stage
  }

  return { currentStageIndex, currentStage, currentStageData };
}

/**
 * Initializes all Proofig stages with default 'pending' status if they don't exist
 */
export function ensureProofigStages(proofigStatus: ProofigDataSchema) {
  if (!proofigStatus.stages) {
    return {
      ...proofigStatus,
      stages: {
        initialPost: { status: 'pending', timestamp: new Date().toISOString() },
        subimageDetection: { status: 'pending', timestamp: new Date().toISOString() },
        subimageSelection: { status: 'pending', timestamp: new Date().toISOString() },
        integrityDetection: { status: 'pending', timestamp: new Date().toISOString() },
        resultsReview: { status: 'pending', timestamp: new Date().toISOString() },
        finalReport: { status: 'pending', timestamp: new Date().toISOString() },
      },
    } satisfies ProofigDataSchema;
  }
  return proofigStatus;
}
