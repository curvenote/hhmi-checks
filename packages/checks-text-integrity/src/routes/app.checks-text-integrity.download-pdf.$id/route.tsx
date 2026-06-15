import type { LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import {
  getConfig,
  getPrismaClient,
  withAppContext,
  File,
  KnownBuckets,
  StorageBackend,
} from '@curvenote/scms-server';
import type { TextIntegrityDataSchema } from '../../schema.js';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../../schema.js';
import { getTextIntegrityConfigWithOverrides } from '../../server/config.server.js';
import { assertSubmitterEulaAccepted } from '../../server/eula.server.js';
import { fetchSimilarityReportPdfFromRelay } from '../../server/fetch-similarity-report-from-relay.server.js';
import { getAppChecksFromAppConfig, resolveServiceName } from '../../server/relay-config.server.js';
import { resolveRelayInstanceId } from '../../server/relay-urls.server.js';
import { resolveSimilarityReportDownloadSource } from '../../server/similarity-report-download.server.js';

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
};

export async function action() {
  throw error405();
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await withAppContext(args);
  const eulaBlock = await assertSubmitterEulaAccepted(ctx);
  if (eulaBlock) {
    throw httpError(403, eulaBlock);
  }

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
  const downloadSource = resolveSimilarityReportDownloadSource(serviceData);

  if (downloadSource.kind === 'storage' && run.work_version_id) {
    const workVersion = await prisma.workVersion.findUnique({
      where: { id: run.work_version_id },
      select: { cdn: true, cdn_key: true },
    });
    if (workVersion?.cdn?.trim() && workVersion.cdn_key?.trim()) {
      const backend = new StorageBackend(ctx, [KnownBuckets.prv, KnownBuckets.pub]);
      const bucket = backend.knownBucketFromCDN(workVersion.cdn);
      if (bucket) {
        const file = new File(backend, downloadSource.path, bucket);
        if (await file.exists()) {
          const stream = await file.readStream();
          return new Response(stream as unknown as ReadableStream, {
            status: 200,
            headers: {
              'Content-Type': downloadSource.contentType,
              'Content-Disposition': `attachment; filename="${downloadSource.filename}"`,
            },
          });
        }
      }
    }
  }

  const pdfId = serviceData.reportPdfId ?? serviceData.latest?.reportPdfId;
  if (!pdfId) {
    throw httpError(400, 'No similarity PDF id stored for this run');
  }

  const appConfig = await getConfig();
  const checks = getAppChecksFromAppConfig(appConfig);
  const relayBaseUrl =
    typeof checks?.relayBaseUrl === 'string' ? checks.relayBaseUrl.trim().replace(/\/$/, '') : '';
  const relayApiKey = typeof checks?.relayApiKey === 'string' ? checks.relayApiKey : '';
  if (!relayBaseUrl || !relayApiKey) {
    throw httpError(503, 'Checks relay is not configured (app.checks.relayBaseUrl / relayApiKey)');
  }

  const appRoot = (appConfig as Record<string, unknown>)?.app as
    | Record<string, unknown>
    | undefined;
  const extensions = appRoot?.extensions as Record<string, unknown> | undefined;
  const baseExt =
    (extensions?.['checks-text-integrity'] as Record<string, unknown> | undefined) ?? {};
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const serviceName = resolveServiceName(mergedConfig);
  const relayInstanceId = resolveRelayInstanceId(mergedConfig);

  const { bytes, contentType, contentDisposition } = await fetchSimilarityReportPdfFromRelay(
    checks ?? {},
    serviceName,
    relayInstanceId,
    serviceData,
  );

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Content-Length': String(bytes.byteLength),
    },
  });
}
