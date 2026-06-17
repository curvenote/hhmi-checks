// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { MINIMAL_PROOFIG_SERVICE_DATA } from '../schema.js';
import { isProofigRunSupersededByRetry } from './runSuperseded.server.js';

describe('isProofigRunSupersededByRetry', () => {
  it('returns false when superseded metadata is absent', () => {
    expect(
      isProofigRunSupersededByRetry({
        data: { serviceData: MINIMAL_PROOFIG_SERVICE_DATA },
      }),
    ).toBe(false);
  });

  it('returns true when supersededByRunId is set', () => {
    expect(
      isProofigRunSupersededByRetry({
        data: {
          serviceData: {
            ...MINIMAL_PROOFIG_SERVICE_DATA,
            supersededByRunId: 'new-run-id',
          },
        },
      }),
    ).toBe(true);
  });
});
