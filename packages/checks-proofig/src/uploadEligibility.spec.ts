// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { WORK_VERSION_DOCX_MIME } from '@curvenote/scms-core';
import { isProofigUploadEligible } from './uploadEligibility.js';

describe('isProofigUploadEligible', () => {
  it('requires exactly one manuscript file', () => {
    expect(isProofigUploadEligible({ files: {} })).toBe(false);
    expect(
      isProofigUploadEligible({
        files: {
          a: { slot: 'manuscript', type: 'application/pdf', size: 1000 },
          b: { slot: 'manuscript', type: 'application/pdf', size: 1000 },
        },
      }),
    ).toBe(false);
  });

  it('accepts one docx or pdf within 50 MB', () => {
    expect(
      isProofigUploadEligible({
        files: {
          a: { slot: 'manuscript', type: 'application/pdf', size: 50 * 1024 * 1024 },
        },
      }),
    ).toBe(true);
    expect(
      isProofigUploadEligible({
        files: {
          a: { slot: 'manuscript', type: WORK_VERSION_DOCX_MIME, size: 1 },
        },
      }),
    ).toBe(true);
  });

  it('rejects oversize or wrong type', () => {
    expect(
      isProofigUploadEligible({
        files: {
          a: { slot: 'manuscript', type: 'application/pdf', size: 50 * 1024 * 1024 + 1 },
        },
      }),
    ).toBe(false);
    expect(
      isProofigUploadEligible({
        files: {
          a: { slot: 'manuscript', type: 'image/png', size: 1000 },
        },
      }),
    ).toBe(false);
  });
});
