import { uuidv7 as uuid } from 'uuidv7';
import {
  enqueueAndDispatchJob,
  getPrismaClient,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import {
  type CheckServiceRunData,
  hasDocxInMetadata,
  hasPdfInMetadata,
  KnownJobTypes,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import type { ExtensionCheckHandleActionArgs } from '@curvenote/scms-core';
import { MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from '../schema.js';
import {
  beginProofigPipeline,
  markDocumentPreparationError,
  markInitialPostError,
} from './stateMachine.server.js';
import { PROOFIG_SUBMIT_STREAM } from './jobs/proofig-submit-stream.server.js';
import { PROOFIG_CONVERTER_FAILURE_CLEANUP } from './jobs/proofig-converter-failure-cleanup.server.js';

export type ProofigCheckRunLineage = {
  retryOfRunId?: string;
  retriedAt?: string;
  retriedByUserId?: string;
};

export type StartProofigCheckRunResult =
  | { ok: true; checkRunId: string }
  | { ok: false; message: string; status: number; checkRunId?: string };

type StartProofigCheckRunOptions = {
  createdById?: string;
  invokedById?: string;
  lineage?: ProofigCheckRunLineage;
};

/**
 * Create a Proofig check run and enqueue submit (or DOCX converter + dependent submit).
 */
export async function startProofigCheckRun(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  options: StartProofigCheckRunOptions = {},
): Promise<StartProofigCheckRunResult> {
  const prisma = await getPrismaClient();
  const workVersion = await prisma.workVersion.findUnique({
    where: { id: workVersionId },
  });
  if (!workVersion) {
    return { ok: false, message: 'Work version not found', status: 404 };
  }

  const metadata =
    workVersion.metadata != null && typeof workVersion.metadata === 'object'
      ? workVersion.metadata
      : null;
  const hasPdf = hasPdfInMetadata(metadata);
  const hasDocx = hasDocxInMetadata(metadata);
  if (!hasPdf && !hasDocx) {
    const noFilesMessage = 'Proofig requires a PDF or a Word document (.docx) on this version.';
    const timestamp = new Date().toISOString();
    const serviceData = markInitialPostError(
      MINIMAL_PROOFIG_SERVICE_DATA,
      noFilesMessage,
      timestamp,
    );
    const failedRun = await prisma.checkServiceRun.create({
      data: {
        id: uuid(),
        date_created: timestamp,
        date_modified: timestamp,
        kind: 'proofig',
        work_version_id: workVersionId,
        created_by_id: options.createdById ?? ctx.user?.id ?? undefined,
        data: {
          status: 'error',
          serviceDataSchema: {},
          serviceData: serviceData as Prisma.JsonObject,
        },
      },
    });
    return {
      ok: false,
      message: noFilesMessage,
      status: 400,
      checkRunId: failedRun.id,
    };
  }

  const timestamp = new Date().toISOString();
  const initialServiceData: ProofigDataSchema = {
    ...MINIMAL_PROOFIG_SERVICE_DATA,
    ...(options.lineage?.retryOfRunId
      ? {
          retryOfRunId: options.lineage.retryOfRunId,
          retriedAt: options.lineage.retriedAt ?? timestamp,
          ...(options.lineage.retriedByUserId
            ? { retriedByUserId: options.lineage.retriedByUserId }
            : {}),
        }
      : {}),
  };

  const run = await prisma.checkServiceRun.create({
    data: {
      id: uuid(),
      date_created: timestamp,
      date_modified: timestamp,
      kind: 'proofig',
      work_version_id: workVersionId,
      created_by_id: options.createdById ?? ctx.user?.id ?? undefined,
      data: {
        status: 'healthy',
        serviceDataSchema: {},
        serviceData: initialServiceData as Prisma.JsonObject,
      },
    },
  });
  const checkRunId = run.id;
  const jobType = PROOFIG_SUBMIT_STREAM;
  const dispatchTimestamp = new Date().toISOString();
  const invokedById = options.invokedById ?? ctx.user?.id;

  try {
    if (hasPdf) {
      await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
        const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
        const nextServiceData = beginProofigPipeline(
          { sourceFormat: 'pdf' },
          current.serviceData ?? initialServiceData,
          dispatchTimestamp,
        );
        return {
          ...current,
          status: 'healthy',
          serviceData: nextServiceData,
        } satisfies CheckServiceRunData<ProofigDataSchema>;
      });

      await enqueueAndDispatchJob({
        job_id: uuid(),
        job_type: jobType,
        payload: {
          work_version_id: workVersionId,
          proofig_run_id: checkRunId,
        },
        invoked_by_id: invokedById,
        activity_type: 'CHECK_STARTED',
        activity_data: { check: { kind: 'proofig' } },
      });
    } else {
      const exportJobId = uuid();
      const proofigJobId = uuid();
      const converterFailureCleanupJobId = uuid();
      await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
        const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
        const nextServiceData = beginProofigPipeline(
          { sourceFormat: 'docx', converterJobId: exportJobId },
          current.serviceData ?? initialServiceData,
          dispatchTimestamp,
        );
        return {
          ...current,
          status: 'healthy',
          serviceData: nextServiceData,
        } satisfies CheckServiceRunData<ProofigDataSchema>;
      });
      await enqueueAndDispatchJob({
        job_id: exportJobId,
        job_type: KnownJobTypes.CONVERTER_TASK,
        payload: {
          work_version_id: workVersionId,
          target: 'pdf',
          conversion_type: 'docx-lowriter-pdf',
        },
        invoked_by_id: invokedById,
        activity_type: 'CONVERTER_TASK_STARTED',
        activity_data: { converter: { target: 'pdf', type: 'docx-lowriter-pdf' } },
        dependents: [
          {
            job_id: proofigJobId,
            job_type: jobType,
            payload: {
              work_version_id: workVersionId,
              proofig_run_id: checkRunId,
            },
            trigger_on: 'success',
            activity_type: 'CHECK_STARTED',
            activity_data: { check: { kind: 'proofig' } },
          },
          {
            job_id: converterFailureCleanupJobId,
            job_type: PROOFIG_CONVERTER_FAILURE_CLEANUP,
            payload: {
              proofig_run_id: checkRunId,
            },
            trigger_on: 'failure',
          },
        ],
      });
    }
  } catch (err: unknown) {
    const jobLabel = hasPdf ? jobType : KnownJobTypes.CONVERTER_TASK;
    console.error(`${jobLabel} job create failed`, err);
    const errMsg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err != null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Proofig submit job failed';
    await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
      const base = current.serviceData ?? initialServiceData;
      const nextServiceData =
        hasPdf || !hasDocx
          ? markInitialPostError(base, errMsg, new Date().toISOString())
          : markDocumentPreparationError(base, errMsg, new Date().toISOString());
      return {
        ...current,
        status: 'error',
        serviceData: nextServiceData,
      } satisfies CheckServiceRunData<ProofigDataSchema>;
    });
    return { ok: false, message: errMsg, status: 500, checkRunId };
  }

  return { ok: true, checkRunId };
}
