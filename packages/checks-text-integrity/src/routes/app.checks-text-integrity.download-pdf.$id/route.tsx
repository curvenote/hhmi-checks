import type { LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import {
  getConfig,
  getPrismaClient,
  safeCheckServiceRunDataUpdate,
  withAppContext,
  File,
  KnownBuckets,
  StorageBackend,
} from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import type { TextIntegrityDataSchema } from '../../schema.js';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA, textIntegrityDataSchema } from '../../schema.js';
import { getTextIntegrityConfigWithOverrides } from '../../server/config.server.js';
import { assertSubmitterEulaAccepted } from '../../server/eula.server.js';
import {
  fetchSimilarityReportPdfFromRelay,
  fetchSimilarityReportPdfFromRelayWhenReady,
} from '../../server/fetch-similarity-report-from-relay.server.js';
import { getAppChecksFromAppConfig, resolveServiceName } from '../../server/relay-config.server.js';
import { resolveRelayInstanceId } from '../../server/relay-urls.server.js';
import { resolveSimilarityReportDownloadSource } from '../../server/similarity-report-download.server.js';
import {
  buildSimilarityReportFileEntry,
  SIMILARITY_REPORT_GENERATED_SLOT,
  similarityReportStoragePath,
} from '../../server/similarity-report-storage.server.js';
import { startSimilarityPdfViaRelay } from '../../server/start-similarity-pdf-via-relay.server.js';
import { writeSimilarityPdfToStorage } from '../../server/write-similarity-pdf-to-storage.server.js';

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
  let serviceData = runData?.serviceData ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;
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

  const existingPdfId = serviceData.reportPdfId ?? serviceData.latest?.reportPdfId;
  if (!existingPdfId && !serviceData.similarityReportPdfInvalidated) {
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

  if (serviceData.similarityReportPdfInvalidated) {
    const newPdfId = await startSimilarityPdfViaRelay(
      checks ?? {},
      serviceName,
      relayInstanceId,
      serviceData,
    );
    serviceData = {
      ...serviceData,
      reportPdfId: newPdfId,
      reportPdfUrl: undefined,
      similarityReportStored: false,
      latest: serviceData.latest
        ? {
            ...serviceData.latest,
            reportPdfId: newPdfId,
            reportPdfUrl: undefined,
          }
        : undefined,
    };

    await safeCheckServiceRunDataUpdate(id, (currentRunData?: Prisma.JsonValue) => {
      const current = (currentRunData ?? {}) as CheckServiceRunData;
      const sdParsed = textIntegrityDataSchema.safeParse(current.serviceData);
      const sd = sdParsed.success ? sdParsed.data : serviceData;
      return {
        ...current,
        serviceData: {
          ...sd,
          reportPdfId: newPdfId,
          reportPdfUrl: undefined,
          similarityReportStored: false,
          latest: sd.latest
            ? {
                ...sd.latest,
                reportPdfId: newPdfId,
                reportPdfUrl: undefined,
              }
            : undefined,
        },
      } as Prisma.JsonObject;
    });
  }

  const wasInvalidated = serviceData.similarityReportPdfInvalidated === true;
  const { bytes, contentType, contentDisposition } = wasInvalidated
    ? await fetchSimilarityReportPdfFromRelayWhenReady(
        checks ?? {},
        serviceName,
        relayInstanceId,
        serviceData,
      )
    : await fetchSimilarityReportPdfFromRelay(
        checks ?? {},
        serviceName,
        relayInstanceId,
        serviceData,
      );

  if (wasInvalidated) {
    let fileEntry: ReturnType<typeof buildSimilarityReportFileEntry> | undefined;
    let storagePath: string | undefined;
    const workVersion = run.work_version_id
      ? await prisma.workVersion.findUnique({
          where: { id: run.work_version_id },
          select: { cdn: true, cdn_key: true },
        })
      : null;
    if (workVersion?.cdn?.trim() && workVersion.cdn_key?.trim()) {
      const backend = new StorageBackend(ctx, [KnownBuckets.prv, KnownBuckets.pub]);
      const bucket = backend.knownBucketFromCDN(workVersion.cdn);
      if (bucket) {
        storagePath = similarityReportStoragePath(workVersion.cdn_key, id);
        const file = new File(backend, storagePath, bucket);
        const { md5, size } = await writeSimilarityPdfToStorage(file, bytes);
        const uploadDate = new Date().toISOString();
        fileEntry = buildSimilarityReportFileEntry(storagePath, size, md5, uploadDate);
      }
    }

    const regeneratedPdfId = serviceData.reportPdfId ?? serviceData.latest?.reportPdfId;
    await safeCheckServiceRunDataUpdate(id, (currentRunData?: Prisma.JsonValue) => {
      const current = (currentRunData ?? {}) as CheckServiceRunData;
      const sdParsed = textIntegrityDataSchema.safeParse(current.serviceData);
      const sd = sdParsed.success ? sdParsed.data : serviceData;
      const nextFiles = { ...(sd.files ?? {}) };
      for (const key of Object.keys(nextFiles)) {
        if (nextFiles[key]?.slot === SIMILARITY_REPORT_GENERATED_SLOT) {
          delete nextFiles[key];
        }
      }
      if (fileEntry && storagePath) {
        nextFiles[storagePath] = fileEntry;
      }
      const nextServiceData: TextIntegrityDataSchema = { ...sd };
      delete nextServiceData.similarityReportPdfInvalidated;
      delete nextServiceData.similarityReportPdfInvalidatedAt;
      delete nextServiceData.similarityReportPdfInvalidatedByEvent;
      return {
        ...current,
        serviceData: {
          ...nextServiceData,
          files: nextFiles,
          similarityReportStored: Boolean(fileEntry),
          storedReportPdfId: fileEntry ? regeneratedPdfId : undefined,
        },
      } as Prisma.JsonObject;
    });
  }

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Content-Length': String(bytes.byteLength),
    },
  });
}
