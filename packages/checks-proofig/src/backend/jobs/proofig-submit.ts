import type { CreateJob } from '@curvenote/scms-core';
import type { Context } from '@curvenote/scms-server';
import { JobStatus } from '@curvenote/scms-db';
import { httpError, coerceToObject } from '@curvenote/scms-core';
import type { WorkVersionPayload, WorkVersionMetadataPayload } from '@curvenote/common';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import {
  getPrismaClient,
  signFilesInMetadata,
  createHandshakeToken,
  publishProofigSubmitMessage,
  jobs,
} from '@curvenote/scms-server';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

/** Job type for Proofig submit via external container service (extension-defined). */
export const PROOFIG_SUBMIT = 'PROOFIG_SUBMIT';

/** Job type for Proofig submit via in-process streaming HTTP call. */
export const PROOFIG_SUBMIT_STREAM = 'PROOFIG_SUBMIT_STREAM';

/** Optional alias for clarity when selecting between service vs stream. */
export const PROOFIG_SUBMIT_SERVICE = PROOFIG_SUBMIT;

const rollingLogEntry = (message: string, data: unknown) => ({ message, data });

/** Normalize to ISO string (data layer may give Date; we always want string in the payload). */
function isoString(value: string | Date | null): string | null {
  if (value == null) return null;
  return typeof value === 'string' ? value : (value as Date).toISOString();
}

/**
 * Map workVersion row to WorkVersionPayload (snake_case).
 * Dates are normalized to ISO strings so the payload always has string dates.
 */
function workVersionToPayload(row: {
  id: string;
  work_id: string;
  date_created: string | Date;
  date_modified: string | Date;
  draft: boolean;
  cdn: string | null;
  cdn_key: string | null;
  title: string;
  description: string | null;
  authors: unknown;
  author_details: unknown;
  date: string | Date | null;
  doi: string | null;
  canonical: boolean | null;
  metadata: unknown;
  occ: number;
}): WorkVersionPayload {
  const metadata = row.metadata != null ? coerceToObject(row.metadata) : null;
  if (!metadata || typeof metadata !== 'object') {
    throw httpError(
      422,
      `Work version ${row.id} has no metadata; Proofig submit requires metadata.files`,
    );
  }
  const authors = Array.isArray(row.authors) ? row.authors : [];
  const authorDetails = Array.isArray(row.author_details) ? row.author_details : [];
  return {
    id: row.id,
    work_id: row.work_id,
    date_created: isoString(row.date_created) ?? '',
    date_modified: isoString(row.date_modified) ?? '',
    draft: row.draft,
    cdn: row.cdn,
    cdn_key: row.cdn_key,
    title: row.title,
    description: row.description,
    authors: authors as string[],
    author_details: authorDetails,
    date: isoString(row.date),
    doi: row.doi,
    canonical: row.canonical,
    metadata: metadata as WorkVersionMetadataPayload,
    occ: row.occ,
  };
}

const CreateProofigSubmitJobPayloadSchema = z.object({
  work_version_id: z.string().uuid('work_version_id is required'),
  proofig_run_id: z.string().min(1, 'proofig_run_id is required'),
});

export type CreateProofigSubmitJobPayload = z.infer<typeof CreateProofigSubmitJobPayloadSchema>;

/**
 * PROOFIG_SUBMIT job handler.
 * Validates payload, loads work version, signs metadata, creates job and linkedJob,
 * publishes to proofig submit topic (from extension config) with workVersion + submit_req_id + notify_url,
 * updates job to RUNNING.
 */
export async function proofigSubmitHandler(
  ctx: Context,
  data: CreateJob,
  _storageBackend?: unknown,
) {
  const rollingLog: { message: string; data: unknown }[] = [];

  const extConfig = ctx.$config.app?.extensions?.['checks-proofig'] as
    | { proofigSubmitTopic?: string; proofigNotifyBaseUrl?: string }
    | undefined;
  const proofigSubmitTopic = extConfig?.proofigSubmitTopic;
  if (!proofigSubmitTopic) {
    throw httpError(
      503,
      'checks-proofig extension config missing proofigSubmitTopic; cannot run PROOFIG_SUBMIT job',
    );
  }

  const parseResult = CreateProofigSubmitJobPayloadSchema.safeParse(data.payload);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e: { message: string }) => e.message).join('; ');
    throw httpError(400, `Invalid PROOFIG_SUBMIT payload: ${msg}`);
  }
  const payload = parseResult.data;
  rollingLog.push(
    rollingLogEntry('payload validated', {
      work_version_id: payload.work_version_id,
      proofig_run_id: payload.proofig_run_id,
    }),
  );

  const prisma = await getPrismaClient();
  const workVersionRow = await prisma.workVersion.findUnique({
    where: { id: payload.work_version_id },
  });
  if (!workVersionRow) {
    throw httpError(404, `Work version ${payload.work_version_id} not found`);
  }
  rollingLog.push(rollingLogEntry('work version loaded', workVersionRow.id));

  const job = await jobs.dbCreateJob({ ...data, status: JobStatus.QUEUED });
  rollingLog.push(rollingLogEntry('job created', job.id));

  await prisma.linkedJob.create({
    data: {
      id: uuidv7(),
      date_created: job.date_created,
      job_id: job.id,
      work_version_id: payload.work_version_id,
    },
  });

  const workVersionPayload = workVersionToPayload(workVersionRow);
  if (workVersionPayload.metadata) {
    const signedMetadata = await signFilesInMetadata(
      workVersionPayload.metadata as Parameters<typeof signFilesInMetadata>[0],
      workVersionRow.cdn ?? '',
      ctx,
    );
    workVersionPayload.metadata = signedMetadata as WorkVersionMetadataPayload;
  }

  const proofigNotifyBaseUrl =
    extConfig.proofigNotifyBaseUrl?.replace(/\/$/, '') ??
    new URL(ctx.request.url).origin + '/v1/hooks/proofig/notify';
  const notify_url = `${proofigNotifyBaseUrl}/${payload.proofig_run_id}`;

  const pubsubPayload = {
    taskId: job.id,
    workVersion: workVersionPayload,
    submit_req_id: payload.proofig_run_id,
    notify_url,
  };
  rollingLog.push(rollingLogEntry('proofig submit payload built', { taskId: job.id }));

  const handshake = createHandshakeToken(
    job.id,
    PROOFIG_SUBMIT,
    ctx.$config.api.handshakeIssuer,
    ctx.$config.api.handshakeSigningSecret,
  );
  const jobUrl = ctx.asApiUrl(`/jobs/${job.id}`);
  if (!ctx.user?.id) {
    throw httpError(401, 'Proofig submit job requires an authenticated user');
  }
  const attributes = {
    handshake,
    jobUrl,
    userId: ctx.user.id,
  };

  const messageId = await publishProofigSubmitMessage(
    attributes,
    pubsubPayload as Record<string, unknown>,
    { topic: proofigSubmitTopic },
  );
  rollingLog.push(rollingLogEntry('Message published to Proofig submit Pub/Sub', { messageId }));

  const updated = await jobs.dbUpdateJob(job.id, {
    status: JobStatus.RUNNING,
    message: 'Proofig submit message published',
    results: {
      rollingLog,
      pubsubMessageId: messageId,
    },
  });
  return updated;
}

// ---------- Shared helpers for streaming submit ----------

type FileEntry = {
  signedUrl?: string;
  name?: string;
  path?: string;
  type?: string;
  // Allow additional properties from metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type WorkVersionMetadataWithFiles = WorkVersionMetadataPayload & {
  files?: Record<string, FileEntry>;
};

function hasPdfFile(files: Record<string, FileEntry> | undefined): FileEntry | null {
  if (!files || typeof files !== 'object') return null;
  const entries = Object.values(files);
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const type = entry.type?.toLowerCase?.();
    const name = (entry.name ?? entry.path ?? '')?.toLowerCase?.();
    const isPdf =
      type === 'application/pdf' ||
      (typeof name === 'string' && (name.endsWith('.pdf') || name === 'pdf'));
    if (isPdf && entry.signedUrl) return entry;
  }
  return null;
}

function getPdfFileFromMetadata(
  metadata: WorkVersionMetadataPayload | null,
  workVersionId: string,
): FileEntry {
  const meta = metadata as WorkVersionMetadataWithFiles | null;
  const pdf = hasPdfFile(meta?.files);
  if (!pdf) {
    throw httpError(
      422,
      `Work version ${workVersionId} metadata.files does not contain a PDF file with signedUrl`,
    );
  }
  return pdf;
}

type ProofigSubmitParams = {
  submit_req_id: string;
  title: string;
  journal: string;
  authors: string;
  identifier: string;
  notes: string;
  filename: string;
  notify_url: string;
};

function buildProofigSubmitParams(
  payload: { submit_req_id: string; notify_url: string; workVersion: WorkVersionPayload },
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

type ProofigSubmitResponse = {
  report_id?: string;
  status?: string;
  error_message?: string;
};

async function postToProofigStream(
  baseUrl: string,
  params: ProofigSubmitParams,
  pdfResponse: Response,
  pdfFilename: string,
): Promise<ProofigSubmitResponse> {
  const boundary = '----ProofigSubmitBoundary' + Math.random().toString(36).slice(2);
  const crlf = '\r\n';

  const jsonPart = JSON.stringify(params);

  const jsonHeader = Buffer.from(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="application/json"${crlf}` +
      `Content-Type: application/json${crlf}${crlf}`,
    'utf8',
  );

  const jsonFooter = Buffer.from(crlf, 'utf8');

  const fileHeader = Buffer.from(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="PDF"; filename="${pdfFilename}"${crlf}` +
      `Content-Type: application/pdf${crlf}${crlf}`,
    'utf8',
  );

  const fileFooter = Buffer.from(crlf + `--${boundary}--${crlf}`, 'utf8');

  if (!pdfResponse.body) {
    throw new Error('PDF download response has no body to stream');
  }

  const pdfReadable = Readable.fromWeb(
    pdfResponse.body as unknown as NodeReadableStream<Uint8Array>,
  );

  const bodyStream = Readable.from(
    (async function* () {
      yield jsonHeader;
      yield Buffer.from(jsonPart, 'utf8');
      yield jsonFooter;

      yield fileHeader;
      for await (const chunk of pdfReadable) {
        yield chunk as Buffer;
      }
      yield fileFooter;
    })(),
  );

  const base = baseUrl.replace(/\/$/, '');
  const url = `${base}/Curvenote/api/submit`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      // No Content-Length: rely on chunked transfer encoding
    },
    // Node fetch accepts a Node.js Readable as body
    body: bodyStream as unknown as BodyInit,
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

/**
 * PROOFIG_SUBMIT_STREAM job handler.
 * Same payload as PROOFIG_SUBMIT but runs the initial post synchronously by:
 * - Loading and signing work version metadata
 * - Streaming the PDF (via signedUrl) directly into a multipart/form-data POST to Proofig
 * - Completing the job with the Proofig response.
 */
export async function proofigSubmitStreamHandler(
  ctx: Context,
  data: CreateJob,
  _storageBackend?: unknown,
) {
  const rollingLog: { message: string; data: unknown }[] = [];

  const parseResult = CreateProofigSubmitJobPayloadSchema.safeParse(data.payload);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e: { message: string }) => e.message).join('; ');
    throw httpError(400, `Invalid PROOFIG_SUBMIT_STREAM payload: ${msg}`);
  }
  const payload = parseResult.data;
  rollingLog.push(
    rollingLogEntry('payload validated', {
      work_version_id: payload.work_version_id,
      proofig_run_id: payload.proofig_run_id,
    }),
  );

  const prisma = await getPrismaClient();
  const workVersionRow = await prisma.workVersion.findUnique({
    where: { id: payload.work_version_id },
  });
  if (!workVersionRow) {
    throw httpError(404, `Work version ${payload.work_version_id} not found`);
  }
  rollingLog.push(rollingLogEntry('work version loaded', workVersionRow.id));

  const job = await jobs.dbCreateJob({ ...data, status: JobStatus.QUEUED });
  rollingLog.push(rollingLogEntry('job created', job.id));

  await prisma.linkedJob.create({
    data: {
      id: uuidv7(),
      date_created: job.date_created,
      job_id: job.id,
      work_version_id: payload.work_version_id,
    },
  });

  const workVersionPayload = workVersionToPayload(workVersionRow);
  if (workVersionPayload.metadata) {
    const signedMetadata = await signFilesInMetadata(
      workVersionPayload.metadata as Parameters<typeof signFilesInMetadata>[0],
      workVersionRow.cdn ?? '',
      ctx,
    );
    workVersionPayload.metadata = signedMetadata as WorkVersionMetadataPayload;
  }

  const pdfFile = getPdfFileFromMetadata(workVersionPayload.metadata, workVersionPayload.id);
  const signedUrl = pdfFile.signedUrl!;
  const filename = (
    pdfFile.name && !pdfFile.name.endsWith('.pdf')
      ? `${pdfFile.name}.pdf`
      : (pdfFile.name ?? pdfFile.path ?? 'manuscript.pdf')
  ) as string;

  const proofigApiBaseUrl = process.env.PROOFIG_API_BASE_URL;
  if (!proofigApiBaseUrl?.trim()) {
    throw httpError(
      503,
      'PROOFIG_API_BASE_URL environment variable is required to run PROOFIG_SUBMIT_STREAM job',
    );
  }

  const proofigNotifyBaseUrl =
    (
      ctx.$config.app?.extensions?.['checks-proofig'] as
        | { proofigNotifyBaseUrl?: string }
        | undefined
    )?.proofigNotifyBaseUrl?.replace(/\/$/, '') ??
    new URL(ctx.request.url).origin + '/v1/hooks/proofig/notify';
  const notify_url = `${proofigNotifyBaseUrl}/${payload.proofig_run_id}`;

  const submitPayload = {
    submit_req_id: payload.proofig_run_id,
    notify_url,
    workVersion: workVersionPayload,
  };
  const params = buildProofigSubmitParams(submitPayload, filename);

  const runningJob = await jobs.dbUpdateJob(job.id, {
    status: JobStatus.RUNNING,
    message: 'Streaming PDF to Proofig...',
    results: {
      rollingLog,
    },
  });
  rollingLog.push(rollingLogEntry('job marked RUNNING', runningJob.id));

  try {
    rollingLog.push(rollingLogEntry('downloading PDF via signedUrl', { signedUrl }));
    const pdfResponse = await fetch(signedUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }

    rollingLog.push(rollingLogEntry('submitting to Proofig via streaming HTTP POST', {}));
    const result = await postToProofigStream(proofigApiBaseUrl, params, pdfResponse, filename);

    const completed = await jobs.dbUpdateJob(job.id, {
      status: JobStatus.COMPLETED,
      message: 'Proofig submission accepted',
      results: {
        rollingLog,
        reportId: result.report_id,
        proofigStatus: result.status,
      },
    });
    return completed;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proofig submit stream failed';
    rollingLog.push(rollingLogEntry('Proofig submit stream failed', { error: message }));
    await jobs.dbUpdateJob(job.id, {
      status: JobStatus.FAILED,
      message,
      results: {
        rollingLog,
      },
    });
    throw httpError(502, message);
  }
}
