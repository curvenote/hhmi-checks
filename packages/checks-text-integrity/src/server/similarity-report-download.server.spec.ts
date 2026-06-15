// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../schema.js';
import { buildSimilarityReportFileEntry } from './similarity-report-storage.server.js';
import { resolveSimilarityReportDownloadSource } from './similarity-report-download.server.js';

describe('resolveSimilarityReportDownloadSource', () => {
  it('prefers storage when serviceData has a generated-slot file', () => {
    const path = 'wv-key/generated/run-1/similarity-report.pdf';
    const data = {
      ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
      similarityReportStored: true,
      files: {
        [path]: buildSimilarityReportFileEntry(path, 100, 'abc', '2025-01-01'),
      },
    };
    expect(resolveSimilarityReportDownloadSource(data)).toEqual({
      kind: 'storage',
      path,
      contentType: 'application/pdf',
      filename: 'similarity-report.pdf',
    });
  });

  it('falls back to relay when nothing is stored', () => {
    expect(resolveSimilarityReportDownloadSource(MINIMAL_TEXT_INTEGRITY_SERVICE_DATA)).toEqual({
      kind: 'relay',
    });
  });
});
