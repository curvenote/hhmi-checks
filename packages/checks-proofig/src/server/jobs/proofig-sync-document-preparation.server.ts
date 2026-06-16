import type { CreateJob } from '@curvenote/scms-core';
import type { Context } from '@curvenote/scms-server';
import { JobStatus } from '@curvenote/scms-db';
import { httpError } from '@curvenote/scms-core';
import { z } from 'zod';
import { jobs } from '@curvenote/scms-server';
import { applyDocumentPreparationFromConverterJob } from '../applyDocumentPreparationFromConverterJob.server.js';

/** Sync check run documentPreparation from a terminal CONVERTER_TASK (failure path). */
export const PROOFIG_SYNC_DOCUMENT_PREPARATION = 'PROOFIG_SYNC_DOCUMENT_PREPARATION';

const CreateProofigSyncDocumentPreparationPayloadSchema = z.object({
  proofig_run_id: z.string().min(1, 'proofig_run_id is required'),
});

export type CreateProofigSyncDocumentPreparationPayload = z.infer<
  typeof CreateProofigSyncDocumentPreparationPayloadSchema
>;

/**
 * Promoted when a DOCX CONVERTER_TASK parent fails. Marks the linked Proofig check run
 * error state without requiring client-side hydrate polling.
 */
export async function proofigSyncDocumentPreparationHandler(_ctx: Context, data: CreateJob) {
  const parseResult = CreateProofigSyncDocumentPreparationPayloadSchema.safeParse(data.payload);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join('; ');
    throw httpError(400, `Invalid ${PROOFIG_SYNC_DOCUMENT_PREPARATION} payload: ${msg}`);
  }

  const applyResult = await applyDocumentPreparationFromConverterJob(
    parseResult.data.proofig_run_id,
  );
  if (!applyResult.ok) {
    return jobs.dbUpdateJob(data.id, {
      status: JobStatus.FAILED,
      message: applyResult.message,
    });
  }

  return jobs.dbUpdateJob(data.id, {
    status: JobStatus.COMPLETED,
    message: applyResult.updated
      ? 'Proofig document preparation synced from converter job'
      : 'Proofig document preparation already synced',
    results: { updated: applyResult.updated },
  });
}
