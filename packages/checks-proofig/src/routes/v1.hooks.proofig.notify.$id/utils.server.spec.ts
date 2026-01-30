import { describe, expect, it } from 'vitest';
import { applyProofigNotifyToServiceData } from './utils.server.js';
import { DEFAULT_STAGES, type ProofigDataSchema } from '../../schema.js';

describe('applyProofigNotifyToServiceData', () => {
  it('maps Processing to subimageDetection when initialPost is completed', () => {
    const initial: ProofigDataSchema = {
      stages: {
        ...DEFAULT_STAGES,
        initialPost: { ...DEFAULT_STAGES.initialPost, status: 'completed' },
      },
    };

    const next = applyProofigNotifyToServiceData(initial, {
      submit_req_id: '',
      report_id: 'd0006e72-4a25-4ace-b9c1-e8f3dfee1e47',
      state: 'Processing',
      subimages_total: 60,
      matches_review: 4,
      matches_report: 1,
      inspects_report: 1,
      report_url: 'https://api.proofig.com/auto/Curvenotelogin?id=abc&token=xyz',
    });

    expect(next.stages.subimageDetection.status).toBe('processing');
  });
});

