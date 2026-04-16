import type { LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { getConfig, getPrismaClient } from '@curvenote/scms-server';
import type { TextIntegrityDataSchema } from '../../schema.js';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../../schema.js';
import { getTextIntegrityConfigWithOverrides } from '../../server/config.server.js';
import {
  checksRelayReportFetchUrl,
  resolveRelayExternalCheckId,
  resolveRelayInstanceId,
} from '../../server/relay-urls.server.js';

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
};

type AppChecksRelay = {
  relayBaseUrl?: string;
  relayApiKey?: string;
};

function readAppChecks(appConfig: unknown): AppChecksRelay | undefined {
  if (appConfig == null || typeof appConfig !== 'object') return undefined;
  const app = (appConfig as Record<string, unknown>).app;
  if (app == null || typeof app !== 'object') return undefined;
  const checks = (app as Record<string, unknown>).checks;
  if (checks == null || typeof checks !== 'object') return undefined;
  return checks as AppChecksRelay;
}

function resolveServiceName(merged: Record<string, unknown>): string {
  const fromExt = merged.serviceName;
  if (typeof fromExt === 'string' && fromExt.trim() !== '') return fromExt.trim();
  return 'echo';
}

export async function action() {
  throw error405();
}

export async function loader(args: LoaderFunctionArgs) {
  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id } });
  if (!run) {
    throw httpError(404, 'Check run not found');
  }

  const runData = run.data as CheckServiceRunData | null;
  const serviceData = runData?.serviceData ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
  const pdfId = serviceData.reportPdfId ?? serviceData.latest?.reportPdfId;
  if (!pdfId) {
    throw httpError(400, 'No similarity PDF id stored for this run');
  }

  const externalId = resolveRelayExternalCheckId(serviceData);
  if (!externalId) {
    throw httpError(400, 'No external check id stored for this run');
  }

  const appConfig = await getConfig();
  const checks = readAppChecks(appConfig);
  const relayBaseUrl =
    typeof checks?.relayBaseUrl === 'string' ? checks.relayBaseUrl.trim().replace(/\/$/, '') : '';
  const relayApiKey = typeof checks?.relayApiKey === 'string' ? checks.relayApiKey : '';
  if (!relayBaseUrl || !relayApiKey) {
    throw httpError(503, 'Checks relay is not configured (app.checks.relayBaseUrl / relayApiKey)');
  }

  const appRoot = (appConfig as Record<string, unknown>)?.app as Record<string, unknown> | undefined;
  const extensions = appRoot?.extensions as Record<string, unknown> | undefined;
  const baseExt =
    (extensions?.['checks-text-integrity'] as Record<string, unknown> | undefined) ?? {};
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const serviceName = resolveServiceName(mergedConfig);
  const relayInstanceId = resolveRelayInstanceId(mergedConfig);

  const url = checksRelayReportFetchUrl(relayBaseUrl, serviceName, relayInstanceId, externalId);

  let relayRes: Response;
  try {
    relayRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${relayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdf_id: pdfId }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw httpError(502, e instanceof Error ? e.message : 'Failed to fetch PDF via checks relay');
  }

  const ct = relayRes.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    let body: Record<string, unknown> = {};
    try {
      body = (await relayRes.json()) as Record<string, unknown>;
    } catch {
      throw httpError(502, 'Checks relay returned invalid JSON for PDF fetch');
    }
    const msg =
      (typeof body.message === 'string' ? body.message : null) ??
      (typeof body.error === 'string' ? body.error : null) ??
      `Checks relay returned HTTP ${relayRes.status}`;
    throw httpError(
      relayRes.status >= 400 && relayRes.status < 600 ? relayRes.status : 502,
      msg,
    );
  }

  if (!relayRes.ok) {
    throw httpError(
      relayRes.status >= 400 && relayRes.status < 600 ? relayRes.status : 502,
      `Checks relay returned HTTP ${relayRes.status}`,
    );
  }

  const bytes = new Uint8Array(await relayRes.arrayBuffer());
  const outCt = ct && !ct.includes('json') ? ct : 'application/pdf';
  const cd =
    relayRes.headers.get('content-disposition') ??
    'attachment; filename="similarity-report.pdf"';

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': outCt,
      'Content-Disposition': cd,
      'Content-Length': String(bytes.byteLength),
    },
  });
}
