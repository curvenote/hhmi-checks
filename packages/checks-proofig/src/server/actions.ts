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
import {
  ALL_PENDING_STAGES,
  MINIMAL_PROOFIG_SERVICE_DATA,
  proofigDataSchema,
  isProofigAwaitingSubimageApprovalInUi,
  type ProofigDataSchema,
  type ProofigStages,
} from '../schema.js';
import { markInitialPostError, startInitialPostProcessing } from './stateMachine.server.js';
import { PROOFIG_SUBMIT_STREAM } from './jobs/proofig-submit-stream.server.js';
import { PROOFIG_SUBMIT } from './jobs/proofig-submit-service.server.js';
import { getProofigConfigWithOverrides } from './config.server.js';
import { postProofigRemoteStatus } from './proofigRemoteStatus.server.js';
import { applyNotifyPayloadToCheckRun } from './applyNotifyPayloadToCheckRun.server.js';
import { getProofingToken } from './proofigAuth.server.js';
import { proofigReportUrlWithAccessToken } from './proofigReportUrl.server.js';

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

async function findProofigRunForWorkVersion(
  workVersionId: string,
  explicitCheckRunId: string | null | undefined,
) {
  const prisma = await getPrismaClient();
  if (explicitCheckRunId?.trim()) {
    return prisma.checkServiceRun.findFirst({
      where: {
        id: explicitCheckRunId.trim(),
        work_version_id: workVersionId,
        kind: 'proofig',
      },
    });
  }
  return prisma.checkServiceRun.findFirst({
    where: { work_version_id: workVersionId, kind: 'proofig' },
    orderBy: { date_modified: 'desc' },
  });
}

function reportIdFromRunData(runData: unknown): string | undefined {
  if (runData == null || typeof runData !== 'object') return undefined;
  const serviceData = (runData as { serviceData?: unknown }).serviceData;
  const parsed = proofigDataSchema.safeParse(serviceData);
  return parsed.success ? parsed.data.reportId : undefined;
}

function proofigStagesFromRunRowData(runData: unknown): ProofigStages {
  if (runData == null || typeof runData !== 'object') return ALL_PENDING_STAGES;
  const serviceData = (runData as { serviceData?: unknown }).serviceData;
  const parsed = proofigDataSchema.safeParse(serviceData);
  if (!parsed.success) return ALL_PENDING_STAGES;
  return { ...ALL_PENDING_STAGES, ...parsed.data.stages };
}

type ProofigRemoteStatusFetchResult =
  | { ok: true; runId: string; body: unknown }
  | { ok: false; result: ExtensionCheckHandleActionResult };

/**
 * Shared: find run, load config, POST Proofig /api/status with a fresh token.
 */
async function fetchProofigRemoteStatusPayload(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  checkRunIdField: string | undefined,
): Promise<ProofigRemoteStatusFetchResult> {
  const prisma = await getPrismaClient();
  const run = await findProofigRunForWorkVersion(workVersionId, checkRunIdField);
  if (!run) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'No Proofig check run found for this work version.' },
        status: 404,
      },
    };
  }
  const reportId = reportIdFromRunData(run.data);
  if (!reportId?.trim()) {
    return {
      ok: false,
      result: {
        error: {
          type: 'general',
          message:
            'This run has no Proofig report_id yet. Wait until the submission to Proofig has completed.',
        },
        status: 400,
      },
    };
  }
  const base =
    (ctx.$config.app?.extensions?.['checks-proofig'] as Record<string, unknown> | undefined) ?? {};
  const mergedConfig = await getProofigConfigWithOverrides(base, prisma);
  const apiBaseUrl =
    (mergedConfig.apiBaseUrl as string | undefined)?.trim() ||
    process.env.PROOFIG_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'checks-proofig apiBaseUrl is not configured.' },
        status: 500,
      },
    };
  }
  const statusResult = await postProofigRemoteStatus(apiBaseUrl, mergedConfig, reportId.trim());
  if (!statusResult.ok) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: statusResult.message },
        status:
          statusResult.statusCode && statusResult.statusCode >= 400 ? statusResult.statusCode : 502,
      },
    };
  }
  return { ok: true, runId: run.id, body: statusResult.body };
}

async function applyProofigRemoteStatusRefresh(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  checkRunIdField: string | undefined,
): Promise<ExtensionCheckHandleActionResult> {
  const fetched = await fetchProofigRemoteStatusPayload(ctx, workVersionId, checkRunIdField);
  if (!fetched.ok) return fetched.result;
  const receivedAt = new Date().toISOString();
  const applyResult = await applyNotifyPayloadToCheckRun(fetched.runId, fetched.body, receivedAt);
  if (!applyResult.ok) {
    const msg =
      applyResult.kind === 'persist'
        ? applyResult.message
        : applyResult.issues.map((i) => i.message).join('; ');
    return {
      error: { type: 'general', message: msg },
      status: 400,
    };
  }
  return { success: true };
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
        created_by_id: ctx.user?.id ?? undefined,
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

  // ----- POST /api/status at Proofig (manual refresh; same payload shape as notify) -----
  if (intent === 'fetch-remote-status') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig fetch-remote-status requires a signed-in context',
        },
        status: 401,
      };
    }
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required' },
        status: 400,
      };
    }
    const checkRunIdField = args.formData?.get('checkRunId')?.toString();
    const fetched = await fetchProofigRemoteStatusPayload(ctx, workVersionId, checkRunIdField);
    if (!fetched.ok) return fetched.result;
    return {
      success: true,
      proofigRemoteStatus: fetched.body,
    } as ExtensionCheckHandleActionResult;
  }

  // ----- Fetch remote status and apply to check run immediately (no preview dialog) -----
  if (intent === 'refresh-remote-status') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig refresh-remote-status requires a signed-in context',
        },
        status: 401,
      };
    }
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required' },
        status: 400,
      };
    }
    const checkRunIdField = args.formData?.get('checkRunId')?.toString();
    return applyProofigRemoteStatusRefresh(ctx, workVersionId, checkRunIdField);
  }

  // ----- Fresh access token for opening Proofig UI (read stored report_url; do not persist token) -----
  if (intent === 'refresh-report-url') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig refresh-report-url requires a signed-in context',
        },
        status: 401,
      };
    }
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required' },
        status: 400,
      };
    }
    const checkRunIdField = args.formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunIdField) {
      return {
        error: { type: 'general', message: 'checkRunId is required' },
        status: 400,
      };
    }

    const prisma = await getPrismaClient();
    const base =
      (ctx.$config.app?.extensions?.['checks-proofig'] as Record<string, unknown> | undefined) ??
      {};

    const [run, mergedConfig] = await Promise.all([
      prisma.checkServiceRun.findFirst({
        where: {
          id: checkRunIdField,
          work_version_id: workVersionId,
          kind: 'proofig',
        },
      }),
      getProofigConfigWithOverrides(base, prisma),
    ]);

    if (!run) {
      return {
        error: { type: 'general', message: 'Proofig check run not found for this work version.' },
        status: 404,
      };
    }

    const rowData = run.data as { serviceData?: unknown } | null;
    const parsed = proofigDataSchema.safeParse(rowData?.serviceData);
    const serviceData = parsed.success ? parsed.data : null;
    const storedReportUrl =
      serviceData?.reportUrl?.trim() || serviceData?.summary?.reportUrl?.trim();
    if (!storedReportUrl) {
      return {
        error: {
          type: 'general',
          message: 'No report URL is stored for this run yet.',
        },
        status: 400,
      };
    }
    const apiBaseUrl =
      (mergedConfig.apiBaseUrl as string | undefined)?.trim() ||
      process.env.PROOFIG_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      return {
        error: {
          type: 'general',
          message: 'checks-proofig apiBaseUrl is not configured.',
        },
        status: 500,
      };
    }

    let token: string;
    try {
      token = await getProofingToken(apiBaseUrl, mergedConfig);
    } catch (e) {
      return {
        error: {
          type: 'general',
          message: e instanceof Error ? e.message : 'Proofig authentication failed',
        },
        status: 502,
      };
    }

    let freshUrl: string;
    try {
      freshUrl = proofigReportUrlWithAccessToken(storedReportUrl, token);
    } catch (e) {
      return {
        error: {
          type: 'general',
          message: e instanceof Error ? e.message : 'Invalid stored report URL',
        },
        status: 400,
      };
    }

    return {
      success: true,
      proofigReportOpenUrl: freshUrl,
    } as ExtensionCheckHandleActionResult & { proofigReportOpenUrl: string };
  }

  /**
   * Work-details load: sync from Proofig /api/status when this run is the latest Proofig run for
   * the version and the pipeline UI is in sub-image approval. No-op otherwise (success).
   */
  if (intent === 'hydrate-subimage-approval-status') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig hydrate-subimage-approval-status requires a signed-in context',
        },
        status: 401,
      };
    }
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required' },
        status: 400,
      };
    }
    const checkRunIdField = args.formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunIdField) {
      return {
        error: { type: 'general', message: 'checkRunId is required' },
        status: 400,
      };
    }
    const prisma = await getPrismaClient();
    const latest = await prisma.checkServiceRun.findFirst({
      where: { work_version_id: workVersionId, kind: 'proofig' },
      orderBy: { date_modified: 'desc' },
      select: { id: true, data: true },
    });
    if (!latest || latest.id !== checkRunIdField) {
      return { success: true };
    }
    const stages = proofigStagesFromRunRowData(latest.data);
    if (!isProofigAwaitingSubimageApprovalInUi(stages)) {
      return { success: true };
    }
    return applyProofigRemoteStatusRefresh(ctx, workVersionId, checkRunIdField);
  }

  // ----- Apply notify-shaped JSON to the check run (same persistence as webhook) -----
  if (intent === 'apply-notify-payload') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'Proofig apply-notify-payload requires a signed-in context',
        },
        status: 401,
      };
    }
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required' },
        status: 400,
      };
    }
    const rawJson = args.formData?.get('notifyPayloadJson')?.toString();
    if (rawJson == null || !rawJson.trim()) {
      return {
        error: { type: 'general', message: 'notifyPayloadJson is required' },
        status: 400,
      };
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawJson) as unknown;
    } catch {
      return {
        error: { type: 'general', message: 'notifyPayloadJson must be valid JSON' },
        status: 400,
      };
    }
    const checkRunIdField = args.formData?.get('checkRunId')?.toString();
    const run = await findProofigRunForWorkVersion(workVersionId, checkRunIdField);
    if (!run) {
      return {
        error: { type: 'general', message: 'No Proofig check run found for this work version.' },
        status: 404,
      };
    }
    const receivedAt = new Date().toISOString();
    const applyResult = await applyNotifyPayloadToCheckRun(run.id, parsedBody, receivedAt);
    if (!applyResult.ok) {
      const msg =
        applyResult.kind === 'persist'
          ? applyResult.message
          : applyResult.issues.map((i) => i.message).join('; ');
      return {
        error: { type: 'general', message: msg },
        status: 400,
      };
    }
    return { success: true };
  }

  return {
    error: { type: 'general', message: 'Unknown intent' },
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
