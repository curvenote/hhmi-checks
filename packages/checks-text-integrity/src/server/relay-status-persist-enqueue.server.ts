import { getPrismaClient } from '@curvenote/scms-server';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  textIntegrityDataSchema,
  type TextIntegrityDataSchema,
} from '../schema.js';
import { enqueueTextIntegrityPersistPdfJob } from './enqueue-persist-pdf.server.js';
import { shouldPersistSimilarityReport } from './similarity-report-storage.server.js';

function readServiceDataFromRunData(runData: unknown): TextIntegrityDataSchema {
  const raw =
    runData != null && typeof runData === 'object'
      ? (runData as { serviceData?: unknown }).serviceData
      : undefined;
  const parsed = textIntegrityDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
}

/**
 * After a successful relay-status refresh, enqueue TEXT_INTEGRITY_PERSIST_PDF when the run
 * has a PDF id that is not yet stored (or differs from the stored id).
 *
 * This covers missed REPORT_GENERATION_COMPLETE notifies: Refresh may apply envelopes (or
 * already have reportPdfId) without going through the notify webhook persist path.
 */
export async function enqueuePersistPdfAfterRelayStatusIfNeeded(
  checkRunId: string,
  invokedById?: string,
): Promise<{ enqueued: boolean }> {
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({
    where: { id: checkRunId },
    select: { work_version_id: true, created_by_id: true, data: true },
  });
  if (!run?.work_version_id) {
    return { enqueued: false };
  }

  const serviceData = readServiceDataFromRunData(run.data);
  if (!shouldPersistSimilarityReport(serviceData)) {
    return { enqueued: false };
  }

  await enqueueTextIntegrityPersistPdfJob(
    run.work_version_id,
    checkRunId,
    invokedById ?? run.created_by_id ?? undefined,
  );
  return { enqueued: true };
}
