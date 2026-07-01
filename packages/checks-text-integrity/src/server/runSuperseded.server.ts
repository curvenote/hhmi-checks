import { getPrismaClient } from '@curvenote/scms-server';

const TEXT_INTEGRITY_KIND = 'checks-text-integrity';

type RunRow = {
  retried?: boolean | null;
  successor_id?: string | null;
};

/** True when a failed run was already retried and should leave the admin failed-runs list. */
export function isTextIntegrityRunSupersededByRetry(run: RunRow): boolean {
  return run.retried === true || Boolean(run.successor_id?.trim());
}

/**
 * Atomically claim a failed run for automated sweep retry.
 * Uses retried_at as a short-lived claim marker (cleared on failure via release).
 */
export async function tryClaimTextIntegrityRunForRetrySweep(
  sourceRunId: string,
): Promise<boolean> {
  const claimedAt = new Date().toISOString();
  const prisma = await getPrismaClient();
  const result = await prisma.checkServiceRun.updateMany({
    where: {
      id: sourceRunId,
      kind: TEXT_INTEGRITY_KIND,
      status: 'error',
      retried: false,
      successor_id: null,
      retried_at: null,
    },
    data: {
      retried_at: claimedAt,
      date_modified: claimedAt,
    },
  });
  return result.count === 1;
}

/** Release a sweep claim when retry did not complete (failure, skip, or error). */
export async function releaseTextIntegrityRunRetrySweepClaim(
  sourceRunId: string,
): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.checkServiceRun.updateMany({
    where: {
      id: sourceRunId,
      kind: TEXT_INTEGRITY_KIND,
      retried: false,
      successor_id: null,
    },
    data: {
      retried_at: null,
      date_modified: new Date().toISOString(),
    },
  });
}

export async function markTextIntegritySourceRunSupersededByRetry(
  sourceRunId: string,
  supersededByRunId: string,
  _supersededByUserId: string | undefined,
): Promise<void> {
  const retriedAt = new Date().toISOString();
  const prisma = await getPrismaClient();
  await prisma.checkServiceRun.update({
    where: { id: sourceRunId },
    data: {
      retried: true,
      retried_at: retriedAt,
      successor_id: supersededByRunId,
      date_modified: retriedAt,
    },
  });
}
