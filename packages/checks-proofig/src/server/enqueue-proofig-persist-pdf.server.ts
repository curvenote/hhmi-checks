import { uuidv7 as uuid } from 'uuidv7';
import { JobStatus } from '@curvenote/scms-db';
import { enqueueAndDispatchJob, getConfig, getPrismaClient } from '@curvenote/scms-server';
import {
  clearProofigReportPdfError,
  clearStoredProofigReport,
  currentProofigReportId,
  shouldPersistProofigReport,
} from '../proofigReportFiles.js';
import { proofigDataSchema } from '../schema.js';
import { patchProofigRunServiceData } from './checkRunColumns.server.js';
import {
  PROOFIG_PERSIST_PDF,
  PROOFIG_PERSIST_PDF_FAILURE_CLEANUP,
} from './jobs/proofigPersistPdf.constants.js';

type EnqueueResult = { enqueued: true; jobId: string } | { enqueued: false; reason: string };

/** Non-terminal statuses: another persist for this run is already in progress. */
const IN_FLIGHT_JOB_STATUSES: JobStatus[] = [
  JobStatus.BLOCKED,
  JobStatus.QUEUED,
  JobStatus.RUNNING,
  JobStatus.SCHEDULED,
];

export type EnqueueProofigPersistPdfOptions = {
  force?: boolean;
  invokedById?: string;
  /** Ignore this job id when checking for an in-flight persist (finishing job). */
  excludeJobId?: string;
};

/**
 * True when a PROOFIG_PERSIST_PDF job for this check run is already queued/running
 * (or blocked/scheduled). Used to avoid duplicate auto-enqueues while the first
 * render has not yet set `proofigReportStored`.
 */
export async function hasInFlightProofigPersistPdfJob(
  checkServiceRunId: string,
  options: { excludeJobId?: string } = {},
): Promise<boolean> {
  const prisma = await getPrismaClient();
  const existing = await prisma.job.findFirst({
    where: {
      job_type: PROOFIG_PERSIST_PDF,
      status: { in: IN_FLIGHT_JOB_STATUSES },
      payload: {
        path: ['check_service_run_id'],
        equals: checkServiceRunId,
      },
      ...(options.excludeJobId ? { id: { not: options.excludeJobId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Enqueue a PROOFIG_PERSIST_PDF job for a check run when it has reached a final report
 * outcome and no PDF has been stored for the current report id yet. Idempotent: safe to
 * call after every notify apply — it no-ops unless a fresh PDF is needed, skips when a
 * persist job for this run is already in flight, and skips when a prior PDF failure is
 * recorded on the run (unless `force`).
 *
 * When `force` is true (manual regenerate), the stored-report, prior-failure, and in-flight
 * checks are bypassed so the user can recover from a failed/stuck first render.
 */
export async function enqueueProofigPersistPdfIfNeeded(
  checkServiceRunId: string,
  options: EnqueueProofigPersistPdfOptions = {},
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

  // A prior persist/render failure for this run must not auto-retry on notify/refresh.
  // Manual Retry / Regenerate passes `force: true` to clear the error and try again.
  if (!options.force && serviceData?.proofigReportPdfError?.trim()) {
    return { enqueued: false, reason: 'prior-failure' };
  }

  if (
    !options.force &&
    (await hasInFlightProofigPersistPdfJob(checkServiceRunId, {
      excludeJobId: options.excludeJobId,
    }))
  ) {
    return { enqueued: false, reason: 'already-in-flight' };
  }

  // Best-effort check-then-act: concurrent notify applies can both pass the in-flight
  // guard and enqueue duplicate PROOFIG_PERSIST_PDF jobs. That is acceptable — both
  // converge on the same CDN object path — but is not atomically serialized.
  const appConfig = await getConfig();
  const invokedById =
    options.invokedById ?? appConfig.api.submissionsServiceAccount?.id ?? 'system-cron';

  const reportId = currentProofigReportId(serviceData);
  const jobId = uuid();
  const failureCleanupJobId = uuid();

  // Clear prior failure so the UI returns to “Generating…”. On force regenerate, also
  // clear stored PDF metadata so Download is replaced by the generating state.
  await patchProofigRunServiceData(checkServiceRunId, (sd) =>
    options.force ? clearStoredProofigReport(sd) : clearProofigReportPdfError(sd),
  );

  await enqueueAndDispatchJob({
    job_id: jobId,
    job_type: PROOFIG_PERSIST_PDF,
    payload: {
      work_version_id: run.work_version_id,
      check_service_run_id: checkServiceRunId,
      ...(reportId ? { report_id: reportId } : {}),
      ...(options.force ? { force: true } : {}),
    },
    invoked_by_id: invokedById,
    activity_type: 'CHECK_STARTED',
    activity_data: { check: { kind: 'proofig' } },
    dependents: [
      {
        job_id: failureCleanupJobId,
        job_type: PROOFIG_PERSIST_PDF_FAILURE_CLEANUP,
        payload: {
          check_service_run_id: checkServiceRunId,
          ...(reportId ? { report_id: reportId } : {}),
        },
        trigger_on: 'failure',
      },
    ],
  });

  return { enqueued: true, jobId };
}

/**
 * After a persist job stores a PDF or fails, enqueue again when the run still needs a PDF
 * for the *current* report id (e.g. reportId changed while this job was in flight).
 *
 * Does not auto-retry when `jobReportId` still matches the current report — that avoids
 * infinite re-enqueue loops on permanent failures for the same report.
 */
export async function enqueueProofigPersistPdfFollowUpIfNeeded(
  checkServiceRunId: string,
  options: { excludeJobId: string; jobReportId?: string; invokedById?: string },
): Promise<EnqueueResult> {
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id: checkServiceRunId } });
  if (!run || run.kind !== 'proofig') {
    return { enqueued: false, reason: 'run-not-found' };
  }

  const runData = run.data as { serviceData?: unknown } | null;
  const parsed = proofigDataSchema.safeParse(runData?.serviceData);
  const serviceData = parsed.success ? parsed.data : undefined;

  if (!shouldPersistProofigReport(serviceData)) {
    return { enqueued: false, reason: 'not-needed' };
  }

  const currentId = currentProofigReportId(serviceData);
  if (options.jobReportId && currentId && options.jobReportId === currentId) {
    return { enqueued: false, reason: 'same-report-no-auto-retry' };
  }

  return enqueueProofigPersistPdfIfNeeded(checkServiceRunId, {
    excludeJobId: options.excludeJobId,
    invokedById: options.invokedById,
  });
}
