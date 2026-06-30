// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { hasError, type ProofigDataSchema } from './schema.js';

const timestamp = '2026-01-01T00:00:00.000Z';

describe('hasError', () => {
  it('returns true when any Proofig stage has errored', () => {
    expect(
      hasError({
        stages: {
          initialPost: { status: 'completed', history: [], timestamp },
          subimageDetection: { status: 'error', history: [], timestamp, error: 'Failed' },
        },
      } as unknown as ProofigDataSchema),
    ).toBe(true);
  });

  it('returns false when stages are missing or no stage has errored', () => {
    expect(hasError(undefined)).toBe(false);
    expect(
      hasError({
        stages: {
          initialPost: { status: 'completed', history: [], timestamp },
          subimageDetection: { status: 'processing', history: [], timestamp },
        },
      } as unknown as ProofigDataSchema),
    ).toBe(false);
  });
});
