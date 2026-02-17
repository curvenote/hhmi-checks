import type { CreateJob, CheckServiceRunData } from '@curvenote/scms-core';
import type { Context } from '@curvenote/scms-server';
import { JobStatus } from '@curvenote/scms-db';
import type { Prisma } from '@curvenote/scms-db';
import { httpError } from '@curvenote/scms-core';
import type { WorkVersionMetadataPayload } from '@curvenote/common';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import {
  getPrismaClient,
  signFilesInMetadata,
  jobs,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import {
  buildProofigSubmitParams,
  getPdfFileFromMetadata,
  postToProofigStream,
  rollingLogEntry,
  workVersionToPayload,
} from './proofig-submit.utils.js';
import { MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from '../../schema.js';
import { completeInitialPostAndSetSubimageDetectionPending } from '../stateMachine.server.js';

/** Job type for Proofig submit via in-process streaming HTTP call. */
export const PROOFIG_SUBMIT_STREAM = 'PROOFIG_SUBMIT_STREAM';

const CreateProofigSubmitJobPayloadSchema = z.object({
  work_version_id: z.string().uuid('work_version_id is required'),
  proofig_run_id: z.string().min(1, 'proofig_run_id is required'),
});

export type CreateProofigSubmitJobPayload = z.infer<typeof CreateProofigSubmitJobPayloadSchema>;

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

  const apiBaseUrl =
    (ctx.$config.app?.extensions?.['checks-proofig'] as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl ?? process.env.PROOFIG_API_BASE_URL;
  if (!apiBaseUrl?.trim()) {
    throw httpError(
      503,
      'checks-proofig extension config missing apiBaseUrl; cannot run PROOFIG_SUBMIT_STREAM job',
    );
  }

  const notifyBaseUrl =
    (
      ctx.$config.app?.extensions?.['checks-proofig'] as { notifyBaseUrl?: string } | undefined
    )?.notifyBaseUrl?.replace(/\/$/, '') ??
    new URL(ctx.request.url).origin + '/v1/hooks/proofig/notify';
  const notify_url = `${notifyBaseUrl}/${payload.proofig_run_id}`;

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
    const result = await postToProofigStream(apiBaseUrl, params, pdfResponse, filename);

    // Transition run stages: initialPost completed, subimageDetection pending
    const receivedAt = new Date().toISOString();
    await safeCheckServiceRunDataUpdate(payload.proofig_run_id, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
      const nextServiceData = completeInitialPostAndSetSubimageDetectionPending(
        current.serviceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
        receivedAt,
      );
      return {
        ...current,
        status: 'healthy',
        serviceData: nextServiceData,
      } satisfies CheckServiceRunData<ProofigDataSchema>;
    });

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
