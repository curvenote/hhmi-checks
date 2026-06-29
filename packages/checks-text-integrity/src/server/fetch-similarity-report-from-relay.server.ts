import { httpError } from '@curvenote/scms-core';
import type { TextIntegrityDataSchema } from '../schema.js';
import {
  checksRelayReportFetchUrl,
  resolveRelayExternalCheckId,
  type AppChecksRelayConfig,
} from './relay-urls.server.js';
import { isPdfBytes } from './pdf-bytes.server.js';

export type FetchedSimilarityReportPdf = {
  bytes: Uint8Array;
  contentType: string;
  contentDisposition: string;
};

export type FetchSimilarityReportPdfReadyOptions = {
  attempts?: number;
  delayMs?: number;
};

const DEFAULT_READY_ATTEMPTS = 4;
const DEFAULT_READY_DELAY_MS = 750;
const MAX_RETRY_AFTER_MS = 3000;

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function shouldRetryPdfFetch(err: unknown): boolean {
  if (!(err instanceof Response)) return false;
  return [404, 409, 425, 429, 500, 502, 503, 504].includes(err.status);
}

function getRetryAfterDelayMs(err: unknown): number | null {
  if (!(err instanceof Response)) return null;
  const retryAfter = err.headers.get('retry-after')?.trim();
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isNaN(retryAt)) return null;
  return Math.min(Math.max(0, retryAt - Date.now()), MAX_RETRY_AFTER_MS);
}

function retryAfterInit(relayRes: Response): ResponseInit | undefined {
  const retryAfter = relayRes.headers.get('retry-after');
  return retryAfter ? { headers: { 'Retry-After': retryAfter } } : undefined;
}

export async function fetchSimilarityReportPdfFromRelay(
  relay: AppChecksRelayConfig,
  serviceName: string,
  relayInstanceId: string,
  serviceData: TextIntegrityDataSchema,
): Promise<FetchedSimilarityReportPdf> {
  const relayBaseUrl = (relay.relayBaseUrl ?? '').trim().replace(/\/$/, '');
  const relayApiKey = (relay.relayApiKey ?? '').trim();
  if (!relayBaseUrl || !relayApiKey) {
    throw httpError(503, 'Checks relay is not configured (relayBaseUrl / relayApiKey)');
  }

  const pdfId = serviceData.reportPdfId ?? serviceData.latest?.reportPdfId;
  if (!pdfId) {
    throw httpError(400, 'No similarity PDF id stored for this run');
  }

  const externalId = resolveRelayExternalCheckId(serviceData);
  if (!externalId) {
    throw httpError(400, 'No external check id stored for this run');
  }

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
      signal: AbortSignal.timeout(120_000),
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
      undefined,
      retryAfterInit(relayRes),
    );
  }

  if (!relayRes.ok) {
    throw httpError(
      relayRes.status >= 400 && relayRes.status < 600 ? relayRes.status : 502,
      `Checks relay returned HTTP ${relayRes.status}`,
      undefined,
      retryAfterInit(relayRes),
    );
  }

  const bytes = new Uint8Array(await relayRes.arrayBuffer());
  if (!isPdfBytes(bytes)) {
    throw httpError(502, 'Checks relay returned a non-PDF response for PDF fetch');
  }
  const contentType = ct && !ct.includes('json') ? ct : 'application/pdf';
  const contentDisposition =
    relayRes.headers.get('content-disposition') ?? 'attachment; filename="similarity-report.pdf"';

  return { bytes, contentType, contentDisposition };
}

export async function fetchSimilarityReportPdfFromRelayWhenReady(
  relay: AppChecksRelayConfig,
  serviceName: string,
  relayInstanceId: string,
  serviceData: TextIntegrityDataSchema,
  options: FetchSimilarityReportPdfReadyOptions = {},
): Promise<FetchedSimilarityReportPdf> {
  const attempts = Math.max(1, options.attempts ?? DEFAULT_READY_ATTEMPTS);
  const delayMs = Math.max(0, options.delayMs ?? DEFAULT_READY_DELAY_MS);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchSimilarityReportPdfFromRelay(
        relay,
        serviceName,
        relayInstanceId,
        serviceData,
      );
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !shouldRetryPdfFetch(err)) {
        throw err;
      }
      await sleep(getRetryAfterDelayMs(err) ?? delayMs);
    }
  }

  throw lastError;
}
