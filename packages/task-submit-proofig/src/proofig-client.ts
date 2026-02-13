/**
 * Build multipart/form-data body and POST to Proofig submit API.
 * Per Proofig REST API 4.2: part 1 name="application/json" (JSON params), part 2 name="PDF" (file).
 */

import type { ProofigSubmitPayload } from './payload.js';

const BOUNDARY = '----ProofigSubmitBoundary' + Math.random().toString(36).slice(2);

export type ProofigSubmitParams = {
  submit_req_id: string;
  title: string;
  journal: string;
  authors: string;
  identifier: string;
  notes: string;
  filename: string;
  notify_url: string;
};

export function buildProofigSubmitParams(
  payload: ProofigSubmitPayload,
  pdfFilename: string,
): ProofigSubmitParams {
  const wv = payload.workVersion;
  const filename = pdfFilename.endsWith('.pdf') ? pdfFilename : `${pdfFilename}.pdf`;
  return {
    submit_req_id: payload.submit_req_id,
    title: wv.title ?? 'Anonymized Title',
    journal: 'HHMI Workspace',
    authors: !wv.authors || wv.authors.length === 0 ? 'Anonymous' : wv.authors.join(', '),
    identifier: wv.id,
    notes: 'Uploaded from HHMI Workspace',
    filename,
    notify_url: payload.notify_url,
  };
}

/**
 * Build multipart body: part 1 application/json (params), part 2 PDF (buffer).
 */
export function buildMultipartBody(
  params: ProofigSubmitParams,
  pdfBuffer: Buffer,
  pdfFilename: string,
): { body: Buffer; contentType: string } {
  const jsonPart = JSON.stringify(params);
  const crlf = '\r\n';
  const parts: Buffer[] = [];

  parts.push(Buffer.from(`--${BOUNDARY}${crlf}`, 'utf8'));
  parts.push(
    Buffer.from(
      `Content-Disposition: form-data; name="application/json"${crlf}Content-Type: application/json${crlf}${crlf}`,
      'utf8',
    ),
  );
  parts.push(Buffer.from(jsonPart, 'utf8'));
  parts.push(Buffer.from(crlf, 'utf8'));

  parts.push(Buffer.from(`--${BOUNDARY}${crlf}`, 'utf8'));
  parts.push(
    Buffer.from(
      `Content-Disposition: form-data; name="PDF"; filename="${pdfFilename}"${crlf}Content-Type: application/pdf${crlf}${crlf}`,
      'utf8',
    ),
  );
  parts.push(pdfBuffer);
  parts.push(Buffer.from(crlf, 'utf8'));
  parts.push(Buffer.from(`--${BOUNDARY}--${crlf}`, 'utf8'));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${BOUNDARY}`,
  };
}

export type ProofigSubmitResponse = {
  report_id?: string;
  status?: string;
  error_message?: string;
};

/**
 * POST to Proofig submit endpoint. Returns response JSON on 200; throws on non-200.
 */
export async function postToProofig(
  baseUrl: string,
  params: ProofigSubmitParams,
  pdfBuffer: Buffer,
  pdfFilename: string,
): Promise<ProofigSubmitResponse> {
  const base = baseUrl.replace(/\/$/, '');
  const url = `${base}/Curvenote/api/submit`;
  const { body, contentType } = buildMultipartBody(params, pdfBuffer, pdfFilename);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(body.length),
    },
    body: new Uint8Array(body),
  });

  const text = await response.text();
  let json: ProofigSubmitResponse;
  try {
    json = text ? (JSON.parse(text) as ProofigSubmitResponse) : {};
  } catch {
    throw new Error(`Proofig API returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const msg = json.error_message ?? text ?? response.statusText;
    throw new Error(`Proofig API error ${response.status}: ${msg}`);
  }

  return json;
}
