import type { CheckServiceRunData } from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import { JobStatus } from '@curvenote/scms-db';
import { getPrismaClient, safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import {
  isProofigAwaitingDocumentPreparationInUi,
  proofigDataSchema,
  type ProofigDataSchema,
} from '../schema.js';
import {
  completeDocumentPreparation,
  markDocumentPreparationError,
} from './stateMachine.server.js';

function lastJobMessage(messages: string[] | null | undefined): string | undefined {
  if (!messages?.length) return undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]?.trim();
    if (msg) return msg;
  }
  return undefined;
}

export type ApplyDocumentPreparationResult =
  | { ok: true; updated: boolean }
  | { ok: false; message: string };

/**
 * Sync check run `documentPreparation` stage from the linked CONVERTER_TASK job row.
 * No-op when preparation is not in flight or the converter job is still running.
 */
export async function applyDocumentPreparationFromConverterJob(
  checkRunId: string,
): Promise<ApplyDocumentPreparationResult> {
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id: checkRunId } });
  if (!run) {
    return { ok: false, message: 'Proofig check run not found.' };
  }

  const rowData = run.data as { serviceData?: unknown; status?: string } | null;
  const parsed = proofigDataSchema.safeParse(rowData?.serviceData);
  if (!parsed.success || !parsed.data.stages) {
    return { ok: true, updated: false };
  }

  const serviceData = parsed.data;
  if (!isProofigAwaitingDocumentPreparationInUi(serviceData.stages)) {
    return { ok: true, updated: false };
  }

  const converterJobId = serviceData.preparation?.converterJobId?.trim();
  if (!converterJobId) {
    return { ok: true, updated: false };
  }

  const job = await prisma.job.findUnique({ where: { id: converterJobId } });
  if (!job) {
    // Job row may not be visible yet immediately after dispatch; poll again later.
    return { ok: true, updated: false };
  }

  if (
    job.status === JobStatus.QUEUED ||
    job.status === JobStatus.RUNNING ||
    job.status === JobStatus.BLOCKED
  ) {
    return { ok: true, updated: false };
  }

  const receivedAt = new Date().toISOString();

  if (job.status === JobStatus.COMPLETED) {
    let didUpdate = false;
    await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
      const nextServiceData = completeDocumentPreparation(
        current.serviceData ?? serviceData,
        receivedAt,
      );
      didUpdate = true;
      return {
        ...current,
        status: 'healthy',
        serviceData: nextServiceData,
      } satisfies CheckServiceRunData<ProofigDataSchema>;
    });
    return { ok: true, updated: didUpdate };
  }

  if (job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) {
    const errorMessage =
      lastJobMessage(job.messages) ??
      (job.status === JobStatus.CANCELLED
        ? 'Document conversion was cancelled.'
        : 'Document conversion failed.');
    let didUpdate = false;
    await safeCheckServiceRunDataUpdate(checkRunId, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<ProofigDataSchema>;
      const nextServiceData = markDocumentPreparationError(
        current.serviceData ?? serviceData,
        errorMessage,
        receivedAt,
      );
      didUpdate = true;
      return {
        ...current,
        status: 'error',
        serviceData: nextServiceData,
      } satisfies CheckServiceRunData<ProofigDataSchema>;
    });
    return { ok: true, updated: didUpdate };
  }

  return { ok: true, updated: false };
}
