import { uuidv7 as uuid } from 'uuidv7';
import type { Context } from '@curvenote/scms-server';
import { jobs } from '@curvenote/scms-server';
import { TEXT_INTEGRITY_PERSIST_PDF } from './jobs/text-integrity-persist-pdf.server.js';
import { TEXT_INTEGRITY_JOB_REGISTRATIONS } from './text-integrity-jobs.server.js';

/**
 * Enqueue background persistence of the similarity PDF after report generation completes.
 * Failures are logged; the notify webhook still returns success.
 */
export async function enqueueTextIntegrityPersistPdfJob(
  ctx: Context,
  workVersionId: string,
  checkServiceRunId: string,
  invokedById?: string,
): Promise<void> {
  try {
    await jobs.invoke(
      ctx,
      {
        id: uuid(),
        job_type: TEXT_INTEGRITY_PERSIST_PDF,
        payload: {
          work_version_id: workVersionId,
          check_service_run_id: checkServiceRunId,
        },
        invoked_by_id: invokedById,
      },
      TEXT_INTEGRITY_JOB_REGISTRATIONS,
    );
  } catch (err) {
    console.error('[checks-text-integrity] TEXT_INTEGRITY_PERSIST_PDF enqueue failed', {
      checkServiceRunId,
      workVersionId,
      err,
    });
  }
}
