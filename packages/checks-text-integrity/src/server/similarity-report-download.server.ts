import type { TextIntegrityDataSchema } from '../schema.js';
import {
  SIMILARITY_REPORT_FILENAME,
  getStoredSimilarityReportFile,
} from './similarity-report-storage.server.js';

export type SimilarityReportDownloadSource =
  | { kind: 'storage'; path: string; contentType: string; filename: string }
  | { kind: 'relay' };

/** Prefer persisted PDF on work storage when serviceData references it. */
export function resolveSimilarityReportDownloadSource(
  serviceData: TextIntegrityDataSchema,
): SimilarityReportDownloadSource {
  const stored = getStoredSimilarityReportFile(serviceData);
  if (stored?.path) {
    return {
      kind: 'storage',
      path: stored.path,
      contentType: stored.type || 'application/pdf',
      filename: stored.name || SIMILARITY_REPORT_FILENAME,
    };
  }
  return { kind: 'relay' };
}
