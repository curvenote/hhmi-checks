import { httpError } from '@curvenote/scms-core';
import type { TextIntegrityDataSchema } from '../schema.js';
import {
  checksRelayReportPdfStartUrl,
  resolveRelayExternalCheckId,
  type AppChecksRelayConfig,
} from './relay-urls.server.js';

type StartSimilarityPdfRelayResponse = {
  status?: string;
  message?: string;
  error?: string;
  result?: {
    pdf_id?: string;
  };
};

async function readRelayStartPdfResponse(res: Response): Promise<StartSimilarityPdfRelayResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as StartSimilarityPdfRelayResponse;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

export async function startSimilarityPdfViaRelay(
  relay: AppChecksRelayConfig,
  serviceName: string,
  relayInstanceId: string,
  serviceData: TextIntegrityDataSchema,
): Promise<string> {
  const relayBaseUrl = (relay.relayBaseUrl ?? '').trim().replace(/\/$/, '');
  const relayApiKey = (relay.relayApiKey ?? '').trim();
  if (!relayBaseUrl || !relayApiKey) {
    throw httpError(503, 'Checks relay is not configured (relayBaseUrl / relayApiKey)');
  }

  const externalId = resolveRelayExternalCheckId(serviceData);
  if (!externalId) {
    throw httpError(400, 'No external check id stored for this run');
  }

  const url = checksRelayReportPdfStartUrl(relayBaseUrl, serviceName, relayInstanceId, externalId);
  let relayRes: Response;
  try {
    relayRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${relayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw httpError(
      502,
      e instanceof Error ? e.message : 'Failed to start PDF generation via checks relay',
    );
  }

  const relayJson = await readRelayStartPdfResponse(relayRes);
  if (!relayRes.ok || relayJson.status === 'error') {
    const detail =
      relayJson.message ?? relayJson.error ?? `Checks relay returned HTTP ${relayRes.status}`;
    throw httpError(
      relayRes.status >= 400 && relayRes.status < 600 ? relayRes.status : 502,
      detail,
    );
  }

  const pdfId = relayJson.result?.pdf_id;
  if (!pdfId || typeof pdfId !== 'string') {
    throw httpError(502, 'checks-relay PDF generation response did not include result.pdf_id');
  }

  return pdfId;
}
