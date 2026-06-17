import type {
  ExtensionCheckHandleActionArgs,
  ExtensionCheckHandleActionResult,
} from '@curvenote/scms-core';
import { getPrismaClient } from '@curvenote/scms-server';
import { isProofigRunFailed } from './isRunFailed.server.js';
import {
  isProofigRunSupersededByRetry,
  markProofigSourceRunSupersededByRetry,
} from './runSuperseded.server.js';
import { startProofigCheckRun } from './startCheckRun.server.js';

const PROOFIG_KIND = 'proofig';

export type ProofigRetryMode = 'user' | 'admin';

/**
 * Retry a failed Proofig check run by creating a new run on the same work version.
 */
export async function retryProofigCheckRun(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  sourceCheckRunId: string,
  mode: ProofigRetryMode,
): Promise<ExtensionCheckHandleActionResult> {
  const prisma = await getPrismaClient();
  const sourceRun = await prisma.checkServiceRun.findFirst({
    where: {
      id: sourceCheckRunId.trim(),
      work_version_id: workVersionId,
      kind: PROOFIG_KIND,
    },
  });
  if (!sourceRun) {
    return {
      error: { type: 'general', message: 'Proofig check run not found for this work version.' },
      status: 404,
    };
  }
  if (!isProofigRunFailed(sourceRun)) {
    return {
      error: { type: 'general', message: 'Only failed check runs can be retried.' },
      status: 400,
    };
  }
  if (isProofigRunSupersededByRetry(sourceRun)) {
    return {
      error: { type: 'general', message: 'This check run has already been retried.' },
      status: 400,
    };
  }

  const retriedAt = new Date().toISOString();
  const createdById =
    mode === 'admin'
      ? (sourceRun.created_by_id ?? ctx.user?.id ?? undefined)
      : (ctx.user?.id ?? undefined);

  const result = await startProofigCheckRun(ctx, workVersionId, {
    createdById,
    invokedById: ctx.user?.id,
    lineage: {
      retryOfRunId: sourceRun.id,
      retriedAt,
      retriedByUserId: ctx.user?.id,
    },
  });

  if (!result.ok) {
    return {
      error: { type: 'general', message: result.message },
      status: result.status,
    };
  }
  try {
    await markProofigSourceRunSupersededByRetry(sourceRun.id, result.checkRunId, ctx.user?.id);
  } catch (err) {
    // The new run already exists; do not fail the retry. The source may briefly
    // remain in the failed-runs list until the mark succeeds on a later attempt.
    console.error(
      `Proofig retry created run ${result.checkRunId} but failed to mark source ${sourceRun.id} as superseded`,
      err,
    );
  }
  return { success: true, checkRunId: result.checkRunId } as ExtensionCheckHandleActionResult & {
    checkRunId: string;
  };
}

export type ProofigBulkRetryItemResult =
  | { runId: string; ok: true; checkRunId: string }
  | { runId: string; ok: false; message: string; eulaSkip?: boolean };

/** Admin bulk retry: each run is retried on behalf of its original submitter. */
export async function retryProofigFailedRunsBulk(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  runIds: string[],
): Promise<{ results: ProofigBulkRetryItemResult[] }> {
  const uniqueIds = [...new Set(runIds.map((id) => id.trim()).filter(Boolean))];
  const results: ProofigBulkRetryItemResult[] = [];

  for (const runId of uniqueIds) {
    const prisma = await getPrismaClient();
    const sourceRun = await prisma.checkServiceRun.findFirst({
      where: { id: runId, kind: PROOFIG_KIND },
    });
    if (!sourceRun) {
      results.push({ runId, ok: false, message: 'Check run not found.' });
      continue;
    }
    const outcome = await retryProofigCheckRun(ctx, sourceRun.work_version_id, runId, 'admin');
    if ('success' in outcome && outcome.success) {
      const checkRunId = (outcome as { checkRunId?: string }).checkRunId ?? '';
      results.push({ runId, ok: true, checkRunId });
    } else {
      const message = outcome.error?.message ?? 'Retry failed';
      results.push({
        runId,
        ok: false,
        message,
        eulaSkip: (outcome as { eulaSkip?: boolean }).eulaSkip,
      });
    }
  }

  return { results };
}
