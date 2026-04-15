import { uuidv7 as uuid } from 'uuidv7';
import {
  getPrismaClient,
  jobs,
  registerExtensionJobs,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import type { Context as ServerContext } from '@curvenote/scms-server';
import {
  type ExtensionCheckHandleActionArgs,
  type ExtensionCheckHandleActionResult,
  type ExtensionCheckStatusArgs,
  hasDocxInMetadata,
  hasPdfInMetadata,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  parseServiceManifestSnapshot,
  textIntegrityDataSchema,
} from '../schema.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { markSimilarityPdfJobRestarted, markSubmissionError } from './stateMachine.server.js';
import { TEXT_INTEGRITY_SUBMIT } from './jobs/text-integrity-submit.server.js';
import { getTextIntegrityConfigWithOverrides } from './config.server.js';
import {
  checksRelayReportPdfStartUrl,
  checksRelayReportViewerUrl,
  resolveRelayExternalCheckId,
  resolveRelayInstanceId,
} from './relay-urls.server.js';

type AppChecksConfig = {
  relayBaseUrl?: string;
  relayApiKey?: string;
};

function getAppChecks(ctx: { $config?: Record<string, unknown> }): AppChecksConfig | undefined {
  const app = ctx.$config?.app as { checks?: AppChecksConfig } | undefined;
  return app?.checks;
}

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
  serviceDataSchema?: Record<string, unknown>;
};

function readServiceDataFromRunData(runData: unknown): TextIntegrityDataSchema | undefined {
  if (runData == null || typeof runData !== 'object') return undefined;
  const raw = (runData as Record<string, unknown>).serviceData;
  const parsed = textIntegrityDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function resolveServiceName(merged: Record<string, unknown>): string {
  const fromExt = merged.serviceName;
  if (typeof fromExt === 'string' && fromExt.trim() !== '') return fromExt.trim();
  return 'echo';
}

async function relaySimilarityPdfStart(
  relayBaseUrl: string,
  relayApiKey: string,
  serviceName: string,
  relayInstanceId: string,
  externalId: string,
  apiKey: string,
  apiBaseUrl: string,
): Promise<Response> {
  const url = checksRelayReportPdfStartUrl(relayBaseUrl, serviceName, relayInstanceId, externalId);
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${relayApiKey}`,
    },
    body: JSON.stringify({
      credentials: { apiKey, apiUrl: apiBaseUrl },
    }),
  });
}

// TODO: these viewer defaults should come from database / stored service settings in future
const VIEWER_URL_DEFAULTS = {
  locale: 'en-US',
  permissionSet: 'EDITOR',
  viewerPermissions: { may_view_submission_full_source: false },
  similarity: {
    default_mode: 'match_overview',
    modes: { match_overview: true, all_sources: true },
  },
  sidebar: { default_mode: 'similarity' },
};

/**
 * Handle Text Integrity check actions.
 * Intent checks-text-integrity:execute creates a check run and enqueues TEXT_INTEGRITY_SUBMIT job.
 * Intent checks-text-integrity:refresh-viewer-url fetches a short-lived viewer URL from checks-relay.
 */
export async function handleTextIntegrityAction(
  args: ExtensionCheckHandleActionArgs,
): Promise<ExtensionCheckHandleActionResult | Response> {
  const { intent: rawIntent, workVersionId, ctx, serverExtensions, formData } = args;
  const intent = rawIntent.startsWith('checks-text-integrity:')
    ? rawIntent.split(':', 2)[1]
    : rawIntent;

  if (intent === 'execute' && ctx) {
    if (!workVersionId) {
      return {
        error: {
          type: 'general',
          message: 'Work version ID is required for Text Integrity execute',
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
          message: 'Text Integrity requires a PDF or a Word document (.docx) on this version.',
        },
        status: 400,
      };
    }

    const baseExt =
      (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
    const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
    const manifest = parseServiceManifestSnapshot(mergedConfig.manifest);
    const initialServiceData: TextIntegrityDataSchema = {
      ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
      ...(manifest ? { manifest } : {}),
    };

    const timestamp = new Date().toISOString();
    const run = await prisma.checkServiceRun.create({
      data: {
        id: uuid(),
        date_created: timestamp,
        date_modified: timestamp,
        kind: 'checks-text-integrity',
        work_version_id: workVersionId,
        created_by_id: ctx.user?.id ?? undefined,
        data: {
          status: 'healthy',
          serviceDataSchema: {},
          serviceData: initialServiceData as Prisma.JsonObject,
        },
      },
    });
    const checkRunId = run.id;

    const extensionJobs = registerExtensionJobs(serverExtensions ?? []);
    try {
      await jobs.invoke(
        ctx as ServerContext,
        {
          id: uuid(),
          job_type: TEXT_INTEGRITY_SUBMIT,
          payload: {
            work_version_id: workVersionId,
            check_service_run_id: checkRunId,
          },
          invoked_by_id: ctx.user?.id,
          activity_type: 'CHECK_STARTED',
          activity_data: { check: { kind: 'checks-text-integrity' } },
        },
        extensionJobs,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Text Integrity submit job failed';
      console.error('TEXT_INTEGRITY_SUBMIT job create failed', err);
      await safeCheckServiceRunDataUpdate(checkRunId, (data?: Prisma.JsonValue) => {
        const current = (data ?? {}) as CheckServiceRunData;
        return {
          ...current,
          status: 'error',
          serviceData: markSubmissionError(current.serviceData ?? initialServiceData, message),
        } as Prisma.JsonObject;
      });
      return {
        error: { type: 'general', message },
        status: 500,
      };
    }

    return { success: true };
  }

  if (intent === 'refresh-viewer-url') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'refresh-viewer-url requires a signed-in context',
        },
        status: 401,
      };
    }

    const checkRunId = formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunId) {
      return {
        error: { type: 'general', message: 'checkRunId is required' },
        status: 400,
      };
    }

    const prisma = await getPrismaClient();
    const run = await prisma.checkServiceRun.findUnique({ where: { id: checkRunId } });
    if (!run) {
      return {
        error: { type: 'general', message: 'Check run not found' },
        status: 404,
      };
    }

    const runData = run.data as Record<string, unknown> | null;
    const serviceData = readServiceDataFromRunData(runData);
    const externalCheckId = resolveRelayExternalCheckId(serviceData);
    if (!externalCheckId) {
      return {
        error: {
          type: 'general',
          message: 'No provider check id on this check run; report viewer is not available',
        },
        status: 400,
      };
    }

    const baseExt =
      (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
    const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
    const checks = getAppChecks(ctx);

    const relayBaseUrl = (checks?.relayBaseUrl ?? '').trim().replace(/\/$/, '');
    const relayApiKey = (checks?.relayApiKey ?? '').trim();
    const apiKey = typeof mergedConfig.apiKey === 'string' ? mergedConfig.apiKey.trim() : '';
    const apiBaseUrl =
      typeof mergedConfig.apiBaseUrl === 'string' ? mergedConfig.apiBaseUrl.trim() : '';

    if (!relayBaseUrl || !relayApiKey) {
      return {
        error: { type: 'general', message: 'Checks relay is not configured' },
        status: 503,
      };
    }
    if (!apiKey || !apiBaseUrl) {
      return {
        error: {
          type: 'general',
          message: 'Text Integrity credentials are not configured',
        },
        status: 503,
      };
    }

    const serviceName = resolveServiceName(mergedConfig);
    const relayInstanceId = resolveRelayInstanceId(mergedConfig);
    const viewerUrlEndpoint = checksRelayReportViewerUrl(
      relayBaseUrl,
      serviceName,
      relayInstanceId,
      externalCheckId,
    );

    let relayResponse: Response;
    try {
      relayResponse = await fetch(viewerUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${relayApiKey}`,
        },
        body: JSON.stringify({
          credentials: { apiKey, apiUrl: apiBaseUrl },
          viewerUserId: ctx.user?.id ?? 'anonymous',
          ...VIEWER_URL_DEFAULTS,
        }),
      });
    } catch (e) {
      return {
        error: {
          type: 'general',
          message: e instanceof Error ? e.message : 'Failed to contact checks-relay',
        },
        status: 502,
      };
    }

    if (!relayResponse.ok) {
      const text = await relayResponse.text().catch(() => '');
      return {
        error: {
          type: 'general',
          message: `Checks relay returned ${relayResponse.status}: ${text}`.trim(),
        },
        status: relayResponse.status,
      };
    }

    const relayResult = (await relayResponse.json()) as {
      result?: { viewerUrl?: string };
    };
    const viewerUrl = relayResult?.result?.viewerUrl;
    if (!viewerUrl) {
      return {
        error: { type: 'general', message: 'No viewer URL returned from checks-relay' },
        status: 502,
      };
    }

    return { success: true, viewerUrl } as ExtensionCheckHandleActionResult & {
      viewerUrl: string;
    };
  }

  /** Report generation failed — restart similarity PDF via relay. */
  if (intent === 'restart-similarity-pdf') {
    if (!ctx) {
      return {
        error: {
          type: 'general',
          message: 'restart-similarity-pdf requires a signed-in context',
        },
        status: 401,
      };
    }
    const checkRunId = formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunId) {
      return { error: { type: 'general', message: 'checkRunId is required' }, status: 400 };
    }

    const prisma = await getPrismaClient();
    const run = await prisma.checkServiceRun.findUnique({ where: { id: checkRunId } });
    if (!run) {
      return { error: { type: 'general', message: 'Check run not found' }, status: 404 };
    }

    const serviceData = readServiceDataFromRunData(run.data) ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
    const externalCheckId = resolveRelayExternalCheckId(serviceData);
    if (!externalCheckId) {
      return {
        error: {
          type: 'general',
          message: 'No provider check id on this check run; cannot restart similarity PDF',
        },
        status: 400,
      };
    }

    const baseExt =
      (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
    const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
    const checks = getAppChecks(ctx);

    const relayBaseUrl = (checks?.relayBaseUrl ?? '').trim().replace(/\/$/, '');
    const relayApiKey = (checks?.relayApiKey ?? '').trim();
    const apiKey = typeof mergedConfig.apiKey === 'string' ? mergedConfig.apiKey.trim() : '';
    const apiBaseUrl =
      typeof mergedConfig.apiBaseUrl === 'string' ? mergedConfig.apiBaseUrl.trim() : '';

    if (!relayBaseUrl || !relayApiKey) {
      return {
        error: { type: 'general', message: 'Checks relay is not configured' },
        status: 503,
      };
    }
    if (!apiKey || !apiBaseUrl) {
      return {
        error: {
          type: 'general',
          message: 'Text Integrity credentials are not configured',
        },
        status: 503,
      };
    }

    const serviceName = resolveServiceName(mergedConfig);
    const relayInstanceId = resolveRelayInstanceId(mergedConfig);

    let startRes: Response;
    try {
      startRes = await relaySimilarityPdfStart(
        relayBaseUrl,
        relayApiKey,
        serviceName,
        relayInstanceId,
        externalCheckId,
        apiKey,
        apiBaseUrl,
      );
    } catch (e) {
      return {
        error: {
          type: 'general',
          message: e instanceof Error ? e.message : 'Failed to contact checks-relay',
        },
        status: 502,
      };
    }

    if (!startRes.ok) {
      const text = await startRes.text().catch(() => '');
      return {
        error: {
          type: 'general',
          message:
            `Checks relay could not restart similarity PDF (${startRes.status}): ${text}`.trim(),
        },
        status: startRes.status >= 400 && startRes.status < 600 ? startRes.status : 502,
      };
    }

    const startResult = (await startRes.json().catch(() => null)) as {
      result?: { pdf_id?: string };
    } | null;
    const newPdfId = startResult?.result?.pdf_id;
    const newPdfUrl =
      newPdfId && apiBaseUrl && externalCheckId
        ? `${apiBaseUrl.replace(/\/$/, '')}/api/v1/submissions/${encodeURIComponent(externalCheckId)}/similarity/pdf/${encodeURIComponent(newPdfId)}`
        : undefined;

    await safeCheckServiceRunDataUpdate(checkRunId, (data?: Prisma.JsonValue) => {
      const current = (data ?? {}) as CheckServiceRunData;
      const sd = current.serviceData ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
      const next = markSimilarityPdfJobRestarted(sd, newPdfId, newPdfUrl);
      return { ...current, serviceData: next } as Prisma.JsonObject;
    });

    return { success: true };
  }

  if (intent !== 'execute') {
    return {
      error: { type: 'general', message: 'Unknown intent' },
      status: 400,
    };
  }

  return {
    error: {
      type: 'general',
      message: 'Text Integrity execute requires context and job creator',
    },
    status: 400,
  };
}

/**
 * Return check run status from DB.
 */
export async function textIntegrityStatus(args: ExtensionCheckStatusArgs): Promise<Response> {
  const { checkRunId } = args;
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({
    where: { id: checkRunId },
  });
  if (!run) {
    return Response.json({ status: 'unknown', serviceData: undefined });
  }
  const runData = run.data as Record<string, unknown> | null;
  const status = typeof runData?.status === 'string' ? runData.status : 'unknown';
  const serviceData = readServiceDataFromRunData(runData);
  return Response.json({ status, serviceData });
}
