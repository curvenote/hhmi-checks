import type { CreateJob } from '@curvenote/scms-core';
import type { Context } from '@curvenote/scms-server';
import { JobStatus } from '@curvenote/scms-db';
import { httpError } from '@curvenote/scms-core';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import {
  getPrismaClient,
  signFilesInMetadata,
  createHandshakeToken,
  publishProofigSubmitMessage,
  jobs,
} from '@curvenote/scms-server';
import type { WorkVersionMetadataPayload } from '@curvenote/common';
import { rollingLogEntry, workVersionToPayload } from './proofig-submit.utils.js';

/** Job type for Proofig submit via external container service (extension-defined). */
export const PROOFIG_SUBMIT = 'PROOFIG_SUBMIT';

/** Optional alias for clarity when selecting between service vs stream. */
export const PROOFIG_SUBMIT_SERVICE = PROOFIG_SUBMIT;

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
