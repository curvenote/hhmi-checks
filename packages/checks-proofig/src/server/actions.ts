import { uuidv7 as uuid } from 'uuidv7';
import {
  getPrismaClient,
  jobs,
  registerExtensionJobs,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import type { Context as ServerContext } from '@curvenote/scms-server';
import {
  buildFollowOnEnvelope,
  type CheckServiceRunData,
  type ExtensionCheckHandleActionArgs,
  type ExtensionCheckHandleActionResult,
  type ExtensionCheckStatusArgs,
  KnownJobTypes,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import { MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from '../schema.js';
import { markInitialPostError, startInitialPostProcessing } from './stateMachine.server.js';
import { PROOFIG_SUBMIT_STREAM } from './jobs/proofig-submit-stream.server.js';
import { PROOFIG_SUBMIT } from './jobs/proofig-submit-service.server.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type FileEntryLike = { type?: string; name?: string; path?: string };

function hasPdfInMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const meta = metadata as Record<string, unknown>;
  const files = meta.files;
  if (!files || typeof files !== 'object') return false;
  const entries = Object.values(files) as FileEntryLike[];
  return entries.some((f) => {
    if (!f || typeof f !== 'object') return false;
    const type = f.type?.toLowerCase?.();
    const name = (f.name ?? f.path ?? '')?.toString?.().toLowerCase?.() ?? '';
    return type === 'application/pdf' || name.endsWith('.pdf') || name === 'pdf';
  });
}

function hasDocxInMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const meta = metadata as Record<string, unknown>;
  const files = meta.files;
  if (!files || typeof files !== 'object') return false;
  const entries = Object.values(files) as FileEntryLike[];
  return entries.some(
    (f) =>
      f?.type === DOCX_MIME ||
      (typeof f?.name === 'string' && f.name.toLowerCase().endsWith('.docx')) ||
      (typeof f?.path === 'string' && f.path.toLowerCase().endsWith('.docx')),
  );
}

// Define the checks metadata section type (matches app schema)
export interface ChecksMetadataSection {
  checks?: {
    enabled?: string[];
    proofig?: ProofigDataSchema;
    'curvenote-structure'?: { dispatched: boolean };
    ithenticate?: { dispatched: boolean };
  };
}

// NOTE: kept for reference in case we need richer metadata handling in future.
// type WorkVersionMetadataWithChecks = WorkVersionMetadata & {
//   checks?: ChecksMetadataSection['checks'];
// };

/**
 * Handle Proofig check actions.
 *
 * Both upload flow and checks page use the same intent, 'execute', to enqueue
 * the Proofig submit job.
 */
export async function handleProofigAction(
  args: ExtensionCheckHandleActionArgs,
): Promise<ExtensionCheckHandleActionResult> {
  const { intent: rawIntent, workVersionId, ctx, serverExtensions } = args;
  const intent = rawIntent.startsWith('proofig:') ? rawIntent.split(':', 2)[1] : rawIntent;

  // ----- Execute path: upload flow or checks page with job creation -----
  if (intent === 'execute' && ctx) {
    if (!workVersionId) {
      return {
        error: {
          type: 'general',
          message: 'Work version ID is required for Proofig execute',
        },
        status: 400,
      };
    }

    const prisma = await getPrismaClient();
    const workVersion = await prisma.workVersion.findUnique({
      where: { id: workVersionId },
    });
    if (!workVersion) {
      return { error: { type: 'general', message: 'Work version not found', status: 404 } };
    }

    const metadata =
      workVersion.metadata != null && typeof workVersion.metadata === 'object'
        ? workVersion.metadata
        : null;
    const hasPdf = hasPdfInMetadata(metadata);
    const hasDocx = hasDocxInMetadata(metadata);
    if (!hasPdf && !hasDocx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig requires a PDF or a Word document (.docx) on this version.',
        },
        status: 400,
      };
    }

    const timestamp = new Date().toISOString();
    const run = await prisma.checkServiceRun.create({
      data: {
        id: uuid(),
        date_created: timestamp,
        date_modified: timestamp,
        kind: 'proofig',
        work_version_id: workVersionId,
        data: {
          status: 'healthy',
          serviceDataSchema: {},
          serviceData: {},
        },
      },
    });
    const checkRunId = run.id;
    const extConfig = ctx.$config.app?.extensions?.['checks-proofig'] as
      | { submitMode?: 'service' | 'stream' }
      | undefined;
    const submitMode =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args as any).submitMode as 'service' | 'stream' | undefined) ??
      extConfig?.submitMode ??
      'stream';
    const jobType = submitMode === 'stream' ? PROOFIG_SUBMIT_STREAM : PROOFIG_SUBMIT;
    await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
      const nextServiceData = startInitialPostProcessing(
        current.serviceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
        new Date().toISOString(),
      );
      return {
        ...current,
        status: 'healthy',
        serviceData: nextServiceData,
      } satisfies CheckServiceRunData<ProofigDataSchema>;
    });

    const extensionJobs = registerExtensionJobs(serverExtensions ?? []);
    try {
      if (hasPdf) {
        await jobs.invoke(
          ctx as ServerContext,
          {
            id: uuid(),
            job_type: jobType,
            payload: {
              work_version_id: workVersionId,
              proofig_run_id: checkRunId,
            },
            invoked_by_id: ctx.user?.id,
            activity_type: 'CHECK_STARTED',
            activity_data: { check: { kind: 'proofig' } },
          },
          extensionJobs,
        );
      } else {
        const exportJobId = uuid();
        const proofigJobId = uuid();
        const followOnSpec = {
          id: proofigJobId,
          job_type: jobType,
          payload: {
            work_version_id: workVersionId,
            proofig_run_id: checkRunId,
          },
          invoked_by_id: ctx.user?.id,
          activity_type: 'CHECK_STARTED' as const,
          activity_data: { check: { kind: 'proofig' as const } },
        };
        await jobs.invoke(
          ctx as ServerContext,
          {
            id: exportJobId,
            job_type: KnownJobTypes.CONVERTER_TASK,
            payload: {
              work_version_id: workVersionId,
              target: 'pdf',
              // conversion_type: 'docx-pandoc-myst-pdf',
              conversion_type: 'docx-lowriter-pdf',
            },
            follow_on: buildFollowOnEnvelope(followOnSpec),
            invoked_by_id: ctx.user?.id,
            activity_type: 'CONVERTER_TASK_STARTED',
            activity_data: { converter: { target: 'pdf', type: 'docx-lowriter-pdf' } },
          },
          extensionJobs,
        );
      }
    } catch (err: any) {
      const jobLabel = hasPdf ? jobType : KnownJobTypes.CONVERTER_TASK;
      console.error(`${jobLabel} job create failed`, err);
      await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
        const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
        const nextServiceData = markInitialPostError(
          current.serviceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
          err?.statusText ?? err?.message ?? 'Proofig submit job failed',
          new Date().toISOString(),
        );
        return {
          ...current,
          status: 'error',
          serviceData: nextServiceData,
        } satisfies CheckServiceRunData<ProofigDataSchema>;
      });
      return {
        error: {
          type: 'general',
          message: err instanceof Error ? err.message : 'Proofig submit job failed',
        },
        status: 500,
      };
    }

    return { success: true };
  }

  // Any other intent is unknown
  if (intent !== 'execute') {
    return {
      error: { type: 'general', message: 'Unknown intent' },
      status: 400,
    };
  }
  // If we got here with a recognised intent but without ctx/createJob, we can't execute.
  return {
    error: {
      type: 'general',
      message: 'Proofig execute requires context and job creator',
    },
    status: 400,
  };
}

/**
 * Stub implementation for check run status. Returns current run data from DB.
 */
export async function proofigStatus(args: ExtensionCheckStatusArgs): Promise<any> {
  const { checkRunId } = args;
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({
    where: { id: checkRunId },
  });
  if (!run) {
    return { status: 'unknown', message: 'Check run not found' };
  }
  const runData = run.data as Record<string, unknown> | null;
  const status = (runData?.status as string) ?? 'unknown';
  const serviceData = runData?.serviceData;
  return { status, serviceData };
}
