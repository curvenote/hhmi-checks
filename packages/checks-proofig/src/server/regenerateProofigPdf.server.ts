import { getPrismaClient } from '@curvenote/scms-server';
import type {
  ExtensionCheckHandleActionArgs,
  ExtensionCheckHandleActionResult,
} from '@curvenote/scms-core';
import { proofigDataSchema } from '../schema.js';
import { getProofigPdfReadiness } from '../proofigReportFiles.js';
import { enqueueProofigPersistPdfIfNeeded } from './enqueue-proofig-persist-pdf.server.js';

export type RegenerateProofigPdfActionArgs = {
  ctx: ExtensionCheckHandleActionArgs['ctx'];
  workVersionId: string | undefined;
  formData: FormData | undefined;
};

/**
 * Force-enqueue a Proofig report PDF persist for an existing check run.
 * Used by the UI Generate / Regenerate PDF action (`intent: regenerate-pdf`).
 */
export async function handleRegenerateProofigPdfAction(
  args: RegenerateProofigPdfActionArgs,
): Promise<ExtensionCheckHandleActionResult> {
  const { ctx, workVersionId, formData } = args;

  if (!ctx) {
    return {
      error: { type: 'general', message: 'Proofig regenerate-pdf requires a signed-in context' },
      status: 401,
    };
  }
  if (!workVersionId) {
    return {
      error: { type: 'general', message: 'Work version ID is required' },
      status: 400,
    };
  }

  const checkRunIdField = formData?.get('checkRunId')?.toString()?.trim();
  if (!checkRunIdField) {
    return { error: { type: 'general', message: 'checkRunId is required' }, status: 400 };
  }

  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findFirst({
    where: {
      id: checkRunIdField,
      work_version_id: workVersionId,
      kind: 'proofig',
    },
  });
  if (!run) {
    return {
      error: { type: 'general', message: 'No Proofig check run found for this work version.' },
      status: 404,
    };
  }

  const rowData = run.data as { serviceData?: unknown } | null;
  const parsed = proofigDataSchema.safeParse(rowData?.serviceData);
  const serviceData = parsed.success ? parsed.data : undefined;
  const readiness = getProofigPdfReadiness(serviceData);

  if (readiness === 'not-final') {
    return {
      error: {
        type: 'general',
        message: 'Report PDF can only be generated once Proofig has a final report.',
      },
      status: 400,
    };
  }
  if (readiness === 'no-url') {
    return {
      error: {
        type: 'general',
        message: 'No report URL is stored for this run yet; cannot regenerate PDF.',
      },
      status: 400,
    };
  }

  const result = await enqueueProofigPersistPdfIfNeeded(run.id, {
    force: true,
    invokedById: ctx.user?.id,
  });
  if (!result.enqueued) {
    return {
      error: { type: 'general', message: `Could not regenerate PDF: ${result.reason}` },
      status: 400,
    };
  }
  return { success: true };
}
