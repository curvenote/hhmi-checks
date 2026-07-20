import { uuidv7 as uuid } from 'uuidv7';
import { enqueueAndDispatchJob, getConfig, getPrismaClient } from '@curvenote/scms-server';
import { proofigDataSchema } from '../schema.js';
import { shouldPersistProofigReport } from '../proofigReportFiles.js';
import { PROOFIG_PERSIST_PDF } from './jobs/proofig-persist-pdf.server.js';

type EnqueueResult = { enqueued: true; jobId: string } | { enqueued: false; reason: string };

/**
 * Enqueue a PROOFIG_PERSIST_PDF job for a check run when it has reached a final report
 * outcome and no PDF has been stored for the current report id yet. Idempotent: safe to
 * call after every notify apply — it no-ops unless a fresh PDF is needed.
 *
 * When `force` is true (manual regenerate), idempotency is bypassed.
 */
export async function enqueueProofigPersistPdfIfNeeded(
  checkServiceRunId: string,
  options: { force?: boolean; invokedById?: string } = {},
): Promise<EnqueueResult> {
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id: checkServiceRunId } });
  if (!run || run.kind !== 'proofig') {
    return { enqueued: false, reason: 'run-not-found' };
  }
  if (!run.work_version_id) {
    return { enqueued: false, reason: 'no-work-version' };
  }

  const runData = run.data as { serviceData?: unknown } | null;
  const parsed = proofigDataSchema.safeParse(runData?.serviceData);
  const serviceData = parsed.success ? parsed.data : undefined;

  if (!options.force && !shouldPersistProofigReport(serviceData)) {
    return { enqueued: false, reason: 'not-needed' };
  }

  const appConfig = await getConfig();
  const invokedById =
    options.invokedById ?? appConfig.api.submissionsServiceAccount?.id ?? 'system-cron';

  const jobId = uuid();
  await enqueueAndDispatchJob({
    job_id: jobId,
    job_type: PROOFIG_PERSIST_PDF,
    payload: {
      work_version_id: run.work_version_id,
      check_service_run_id: checkServiceRunId,
      ...(options.force ? { force: true } : {}),
    },
    invoked_by_id: invokedById,
    activity_type: 'CHECK_STARTED',
    activity_data: { check: { kind: 'proofig' } },
  });

  return { enqueued: true, jobId };
}
