import type { ProofigDataSchema } from '../schema.js';

export function initialiseMetadataSection(): ProofigDataSchema {
  return {
    dispatched: false,
    stages: {
      initialPost: { status: 'pending' },
      subimageDetection: { status: 'pending' },
      subimageSelection: { status: 'pending' },
      integrityDetection: { status: 'pending' },
      resultsReview: { status: 'pending' },
      finalReport: { status: 'pending' },
    },
  };
}
