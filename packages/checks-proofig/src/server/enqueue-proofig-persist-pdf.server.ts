import { uuidv7 as uuid } from 'uuidv7';
import { JobStatus } from '@curvenote/scms-db';
import { enqueueAndDispatchJob, getConfig, getPrismaClient } from '@curvenote/scms-server';
import { proofigDataSchema } from '../schema.js';
import { shouldPersistProofigReport } from '../proofigReportFiles.js';
import { PROOFIG_PERSIST_PDF } from './jobs/proofig-persist-pdf.server.js';

type EnqueueResult = { enqueued: true; jobId: string } | { enqueued: false; reason: string };

/** Non-terminal statuses: another persist for this run is already in progress. */
const IN_FLIGHT_JOB_STATUSES: JobStatus[] = [
  JobStatus.BLOCKED,
  JobStatus.QUEUED,
  JobStatus.RUNNING,
  JobStatus.SCHEDULED,
];

/**
 * True when a PROOFIG_PERSIST_PDF job for this check run is already queued/running
 * (or blocked/scheduled). Used to avoid duplicate auto-enqueues while the first
 * render has not yet set `proofigReportStored`.
 */
export async function hasInFlightProofigPersistPdfJob(checkServiceRunId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const existing = await prisma.job.findFirst({
    where: {
      job_type: PROOFIG_PERSIST_PDF,
      status: { in: IN_FLIGHT_JOB_STATUSES },
      payload: {
        path: ['check_service_run_id'],
        equals: checkServiceRunId,
      },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Enqueue a PROOFIG_PERSIST_PDF job for a check run when it has reached a final report
 * outcome and no PDF has been stored for the current report id yet. Idempotent: safe to
 * call after every notify apply — it no-ops unless a fresh PDF is needed, and skips when
 * a persist job for this run is already in flight (unless `force`).
 *
 * When `force` is true (manual regenerate), the stored-report and in-flight checks are
 * bypassed so the user can recover from a failed/stuck first render.
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

  if (!options.force && (await hasInFlightProofigPersistPdfJob(checkServiceRunId))) {
    return { enqueued: false, reason: 'already-in-flight' };
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
