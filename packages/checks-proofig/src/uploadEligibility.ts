import {
  getFilesForSlot,
  isDocxOrPdfFile,
} from '@curvenote/scms-core';

const PROOFIG_MAX_BYTES = 50 * 1024 * 1024;
const MANUSCRIPT_SLOT = 'manuscript';

/** Proofig: exactly one manuscript file, DOCX or PDF, max 50 MB. */
export function isProofigUploadEligible(metadata: unknown): boolean {
  const files = getFilesForSlot(metadata, MANUSCRIPT_SLOT);
  if (files.length !== 1) return false;
  const f = files[0];
  const size = typeof f.size === 'number' ? f.size : 0;
  return isDocxOrPdfFile(f) && size > 0 && size <= PROOFIG_MAX_BYTES;
}
