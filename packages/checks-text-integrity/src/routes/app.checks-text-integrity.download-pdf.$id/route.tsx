import type { LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { getConfig, getPrismaClient } from '@curvenote/scms-server';
import type { TextIntegrityDataSchema } from '../../schema.js';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../../schema.js';
import { getTextIntegrityConfigWithOverrides } from '../../server/config.server.js';

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
};

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
  const pdfUrl = serviceData.reportPdfUrl ?? serviceData.latest?.reportPdfUrl;
  if (!pdfUrl) {
    throw httpError(400, 'No similarity PDF URL stored for this run');
  }

  const appConfig = await getConfig();
  const baseExt =
    ((appConfig as Record<string, any>)?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const apiKey = typeof mergedConfig.apiKey === 'string' ? mergedConfig.apiKey.trim() : '';
  if (!apiKey) {
    throw httpError(503, 'Text Integrity API key is not configured');
  }

  let tcaRes: Response;
  try {
    tcaRes = await fetch(pdfUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw httpError(502, e instanceof Error ? e.message : 'Failed to fetch PDF from provider');
  }

  if (!tcaRes.ok) {
    throw httpError(
      tcaRes.status >= 400 && tcaRes.status < 600 ? tcaRes.status : 502,
      `Provider returned ${tcaRes.status}`,
    );
  }

  const bytes = new Uint8Array(await tcaRes.arrayBuffer());
  const ct = tcaRes.headers.get('content-type') ?? 'application/pdf';
  const cd =
    tcaRes.headers.get('content-disposition') ??
    'attachment; filename="similarity-report.pdf"';

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Content-Disposition': cd,
      'Content-Length': String(bytes.byteLength),
    },
  });
}
