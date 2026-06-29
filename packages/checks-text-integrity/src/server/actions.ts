import { uuidv7 as uuid } from 'uuidv7';
import { getPrismaClient, safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import {
  type ExtensionCheckHandleActionArgs,
  type ExtensionCheckHandleActionResult,
  type ExtensionCheckStatusArgs,
  checkMaintenanceActionError,
  maintenanceGuardFromConfig,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  parseServiceManifestSnapshot,
  textIntegrityDataSchema,
} from '../schema.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { markSimilarityPdfJobRestarted, markSubmissionError } from './stateMachine.server.js';
import {
  getTextIntegrityConfigWithOverrides,
  type TextIntegrityServiceSettings,
} from './config.server.js';
import { startTextIntegrityCheckRun } from './startCheckRun.server.js';
import { retryTextIntegrityCheckRun } from './retryCheckRun.server.js';
import type { RelayNotifyEnvelope } from '@curvenote/check-relay-types';
import {
  checksRelayCheckStatusUrl,
  checksRelayReportPdfStartUrl,
  checksRelayReportViewerUrl,
  resolveRelayExternalCheckId,
  resolveRelayInstanceId,
} from './relay-urls.server.js';
import { applyRelayCheckStatusEnvelopes } from './relay-status-apply.server.js';
import {
  acceptEulaAtProvider,
  assertSubmitterEulaAccepted,
  buildViewerEulaPayload,
  getEulaStatusForUser,
  recordUserEulaAcceptance,
} from './eula.server.js';
import { buildRelayContextEnvelope } from './relay-context.server.js';

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

/** Persist a failed dispatch so checks/details pages can show the error. */
async function recordTextIntegrityExecuteFailure(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  message: string,
): Promise<void> {
  const prisma = await getPrismaClient();
  const baseExt =
    (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const manifest = parseServiceManifestSnapshot(mergedConfig.manifest);
  const serviceData = markSubmissionError(
    {
      ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
      ...(manifest ? { manifest } : {}),
    },
    message,
  );
  const timestamp = new Date().toISOString();
  await prisma.checkServiceRun.create({
    data: {
      id: uuid(),
      date_created: timestamp,
      date_modified: timestamp,
      kind: 'checks-text-integrity',
      work_version_id: workVersionId,
      created_by_id: ctx.user?.id ?? undefined,
      data: {
        status: 'error',
        serviceDataSchema: {},
        serviceData: serviceData as Prisma.JsonObject,
      },
    },
  });
}

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
): Promise<Response> {
  const url = checksRelayReportPdfStartUrl(relayBaseUrl, serviceName, relayInstanceId, externalId);
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${relayApiKey}`,
    },
    body: JSON.stringify({}),
  });
}

// TODO: these viewer defaults should come from database / stored service settings in future
const VIEWER_URL_DEFAULTS = {
  locale: 'en-US',
  permissionSet: 'EDITOR',
  similarity: {
    default_mode: 'match_overview',
    modes: { match_overview: true, all_sources: true },
    view_settings: { save_changes: true },
  },
  sidebar: { default_mode: 'similarity' },
};

/**
 * Handle Text Integrity check actions.
 * Intent checks-text-integrity:execute creates a check run and enqueues TEXT_INTEGRITY_SUBMIT job.
 * Intent checks-text-integrity:refresh-viewer-url fetches a short-lived viewer URL from checks-relay.
 * Intent checks-text-integrity:relay-status POSTs checks-relay check status and applies returned notify envelopes.
 */
export async function handleTextIntegrityAction(
  args: ExtensionCheckHandleActionArgs,
): Promise<ExtensionCheckHandleActionResult | Response> {
  const { intent: rawIntent, workVersionId, ctx, formData } = args;
  const intent = rawIntent.startsWith('checks-text-integrity:')
    ? rawIntent.split(':', 2)[1]
    : rawIntent;

  if (intent === 'eula-status' && ctx) {
    try {
      const status = await getEulaStatusForUser(ctx);
      return {
        success: true,
        ...status,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load EULA status';
      return { error: { type: 'general', message }, status: 500 };
    }
  }

  const outboundIntents = new Set([
    'accept-eula',
    'execute',
    'retry',
    'refresh-viewer-url',
    'relay-status',
    'restart-similarity-pdf',
  ]);
  if (ctx && outboundIntents.has(intent)) {
    const prisma = await getPrismaClient();
    const baseExt =
      (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
    const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
    const maintenanceBlock = maintenanceGuardFromConfig(mergedConfig);
    if (maintenanceBlock) {
      return checkMaintenanceActionError(maintenanceBlock.error?.message);
    }
  }

  if (intent === 'accept-eula' && ctx) {
    const version = formData?.get('version')?.toString()?.trim();
    const language = formData?.get('language')?.toString()?.trim() || 'en-US';
    if (!version) {
      return { error: { type: 'general', message: 'version is required' }, status: 400 };
    }
    try {
      const acceptedAt = new Date().toISOString();
      await acceptEulaAtProvider(ctx, version, language, acceptedAt);
      await recordUserEulaAcceptance(ctx, {
        version,
        language,
        acceptedAt,
        shownAt: acceptedAt,
      });
      return { success: true, accepted: true, version, acceptedAt };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept EULA';
      return { error: { type: 'general', message }, status: 500 };
    }
  }

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

    const eulaBlock = await assertSubmitterEulaAccepted(ctx);
    if (eulaBlock) {
      await recordTextIntegrityExecuteFailure(ctx, workVersionId, eulaBlock);
      const status = await getEulaStatusForUser(ctx);
      return {
        error: { type: 'general', message: eulaBlock },
        status: 400,
        requiresEula: true,
        requireEula: status.requireEula,
        eula: status.eula,
      };
    }

    const result = await startTextIntegrityCheckRun(ctx, workVersionId);
    if (!result.ok) {
      return {
        error: { type: 'general', message: result.message },
        status: result.status,
      };
    }
    return { success: true };
  }

  if (intent === 'retry' && ctx) {
    if (!workVersionId) {
      return {
        error: { type: 'general', message: 'Work version ID is required for Text Integrity retry' },
        status: 400,
      };
    }
    const checkRunId = formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunId) {
      return { error: { type: 'general', message: 'checkRunId is required' }, status: 400 };
    }
    return retryTextIntegrityCheckRun(ctx, workVersionId, checkRunId, 'user');
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

    const eulaBlock = await assertSubmitterEulaAccepted(ctx);
    if (eulaBlock) {
      const status = await getEulaStatusForUser(ctx);
      return {
        error: { type: 'general', message: eulaBlock },
        status: 400,
        requiresEula: true,
        requireEula: status.requireEula,
        eula: status.eula,
      };
    }

    const eulaPayload = await buildViewerEulaPayload(ctx);

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

    if (!relayBaseUrl || !relayApiKey) {
      return {
        error: { type: 'general', message: 'Checks relay is not configured' },
        status: 503,
      };
    }

    const serviceName = resolveServiceName(mergedConfig);
    const relayInstanceId = resolveRelayInstanceId(mergedConfig);
    const relayContext = buildRelayContextEnvelope(
      mergedConfig.settings as TextIntegrityServiceSettings,
    );
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
          viewerUserId: ctx.user?.id ?? 'anonymous',
          ...VIEWER_URL_DEFAULTS,
          ...(relayContext ? { relayContext } : {}),
          ...(eulaPayload ? { eula: eulaPayload } : {}),
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

  /** Poll checks-relay check status and apply notify-equivalent envelopes to this run. */
  if (intent === 'relay-status') {
    if (!ctx) {
      return {
        error: { type: 'general', message: 'relay-status requires a signed-in context' },
        status: 401,
      };
    }
    const checkRunId = formData?.get('checkRunId')?.toString()?.trim();
    if (!checkRunId) {
      return { error: { type: 'general', message: 'checkRunId is required' }, status: 400 };
    }
    if (!workVersionId) {
      return { error: { type: 'general', message: 'workVersionId is required' }, status: 400 };
    }

    const prisma = await getPrismaClient();
    const run = await prisma.checkServiceRun.findUnique({ where: { id: checkRunId } });
    if (!run || run.work_version_id !== workVersionId) {
      return { error: { type: 'general', message: 'Check run not found' }, status: 404 };
    }

    const serviceData = readServiceDataFromRunData(run.data);
    const externalCheckId = resolveRelayExternalCheckId(serviceData);
    if (!externalCheckId) {
      return {
        error: {
          type: 'general',
          message: 'No provider check id on this run yet; try again after upload completes',
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

    if (!relayBaseUrl || !relayApiKey) {
      return {
        error: { type: 'general', message: 'Checks relay is not configured' },
        status: 503,
      };
    }

    const serviceName = resolveServiceName(mergedConfig);
    const relayInstanceId = resolveRelayInstanceId(mergedConfig);
    const statusUrl = checksRelayCheckStatusUrl(
      relayBaseUrl,
      serviceName,
      relayInstanceId,
      externalCheckId,
    );

    let relayResponse: Response;
    try {
      relayResponse = await fetch(statusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${relayApiKey}`,
        },
        body: JSON.stringify({ client_id: checkRunId }),
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

    const rawText = await relayResponse.text().catch(() => '');
    let json: unknown;
    try {
      json = rawText ? JSON.parse(rawText) : {};
    } catch {
      return {
        error: { type: 'general', message: 'checks-relay returned invalid JSON' },
        status: 502,
      };
    }

    if (!relayResponse.ok) {
      return {
        error: {
          type: 'general',
          message: `Checks relay returned ${relayResponse.status}: ${rawText}`.trim(),
        },
        status:
          relayResponse.status >= 400 && relayResponse.status < 600 ? relayResponse.status : 502,
      };
    }

    const envelopes = (json as { envelopes?: RelayNotifyEnvelope[] }).envelopes;
    if (!Array.isArray(envelopes)) {
      return {
        error: { type: 'general', message: 'checks-relay status response missing envelopes array' },
        status: 502,
      };
    }

    const applied = await applyRelayCheckStatusEnvelopes(checkRunId, envelopes);
    if (!applied.ok) {
      return { error: { type: 'general', message: applied.message }, status: 400 };
    }

    return { success: true };
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

    if (!relayBaseUrl || !relayApiKey) {
      return {
        error: { type: 'general', message: 'Checks relay is not configured' },
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
    if (!newPdfId || typeof newPdfId !== 'string') {
      return {
        error: {
          type: 'general',
          message: 'Checks relay did not return a similarity PDF id; cannot restart',
        },
        status: 502,
      };
    }

    await safeCheckServiceRunDataUpdate(checkRunId, (data?: Prisma.JsonValue) => {
      const current = (data ?? {}) as CheckServiceRunData;
      const sd = current.serviceData ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
      const next = markSimilarityPdfJobRestarted(sd, newPdfId);
      return { ...current, serviceData: next } as Prisma.JsonObject;
    });

    return { success: true };
  }

  if (intent !== 'execute' && intent !== 'retry') {
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
