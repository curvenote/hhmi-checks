import { data } from 'react-router';
import { uuidv7 as uuid } from 'uuidv7';
import {
  getPrismaClient,
  jobs,
  registerExtensionJobs,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import type { Context as ServerContext } from '@curvenote/scms-server';
import type {
  CheckServiceRunData,
  ExtensionCheckHandleActionArgs,
  ExtensionCheckStatusArgs,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import { MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from '../schema.js';
import { markInitialPostError, startInitialPostProcessing } from './stateMachine.server.js';
import { PROOFIG_SUBMIT_STREAM } from './jobs/proofig-submit-stream.server.js';
import { PROOFIG_SUBMIT } from './jobs/proofig-submit-service.server.js';

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
export async function handleProofigAction(args: ExtensionCheckHandleActionArgs): Promise<Response> {
  const { intent: rawIntent, workVersionId, ctx, serverExtensions } = args;
  const intent = rawIntent.startsWith('proofig:') ? rawIntent.split(':', 2)[1] : rawIntent;

  // ----- Execute path: upload flow or checks page with job creation -----
  if (intent === 'execute' && ctx) {
    if (!workVersionId) {
      return data(
        { error: { type: 'general', message: 'Work version ID is required for Proofig execute' } },
        { status: 400 },
      ) as unknown as Response;
    }

    const prisma = await getPrismaClient();
    const timestamp = new Date().toISOString();

    // Create a new checkServiceRun row for this execution.
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
    // Determine submit mode: explicit override on args, then extension config, defaulting to 'service'.
    const extConfig = ctx.$config.app?.extensions?.['checks-proofig'] as
      | { proofigSubmitMode?: 'service' | 'stream' }
      | undefined;
    const submitMode =
      // Allow callers to explicitly override per-request if they add this field.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args as any).submitMode as 'service' | 'stream' | undefined) ??
      extConfig?.proofigSubmitMode ??
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

    try {
      const jobId = uuid();
      // Allow platform to pass through the full list of server extensions; fall back to empty list.

      await jobs.invoke(
        ctx as ServerContext,
        {
          id: jobId,
          job_type: jobType,
          payload: {
            work_version_id: workVersionId,
            proofig_run_id: checkRunId,
          },
        },
        registerExtensionJobs(serverExtensions ?? []),
      );
    } catch (err: any) {
      console.error(`${jobType} job create failed`, err);
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
      return data(
        {
          error: {
            type: 'general',
            message: err instanceof Error ? err.message : 'Proofig submit job failed',
          },
        },
        { status: 500 },
      ) as unknown as Response;
    }

    return data({ success: true }) as unknown as Response;
  }

  // Any other intent is unknown
  if (intent !== 'execute') {
    return data(
      { error: { type: 'general', message: 'Unknown intent' } },
      { status: 400 },
    ) as unknown as Response;
  }
  // If we got here with a recognised intent but without ctx/createJob, we can't execute.
  return data(
    { error: { type: 'general', message: 'Proofig execute requires context and job creator' } },
    { status: 400 },
  ) as unknown as Response;
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
