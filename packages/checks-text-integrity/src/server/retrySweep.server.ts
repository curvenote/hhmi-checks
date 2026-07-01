import {
  CronEndpointScopes,
  CronJobTargetAuth,
  CronJobTargetType,
  dbSeedBuiltinCronJob,
  getConfig,
  getPrismaClient,
  hooksNotifyBaseUrl,
} from '@curvenote/scms-server';
import type { ExtensionCheckHandleActionArgs } from '@curvenote/scms-core';
import { getTextIntegrityConfigWithOverrides } from './config.server.js';
import {
  releaseTextIntegrityRunRetrySweepClaim,
  tryClaimTextIntegrityRunForRetrySweep,
} from './runSuperseded.server.js';
import {
  computeTextIntegrityRetryScheduledAt,
  getTextIntegrityRetryPolicy,
  textIntegrityRetryEligibilityCutoff,
} from './retryPolicy.server.js';
import { retryTextIntegrityCheckRun } from './retryCheckRun.server.js';

const TEXT_INTEGRITY_KIND = 'checks-text-integrity';
const RETRY_SWEEP_CRON_ID = 'text-integrity-retry-sweep';
const DEFAULT_SWEEP_LIMIT = 25;

export type TextIntegrityRetrySweepResult = {
  scanned: number;
  retried: number;
  skippedClaimed: number;
  skippedEula: number;
  failed: number;
  errors: { runId: string; message: string }[];
};

function resolveServiceAccountUserId(config: Awaited<ReturnType<typeof getConfig>>): string {
  return config.api.submissionsServiceAccount?.id ?? 'system-cron';
}

async function buildRetrySweepContext(): Promise<
  NonNullable<ExtensionCheckHandleActionArgs['ctx']>
> {
  const config = await getConfig();
  return {
    $config: config as Record<string, unknown>,
    user: { id: resolveServiceAccountUserId(config) },
  } as NonNullable<ExtensionCheckHandleActionArgs['ctx']>;
}

/** Find failed, non-superseded runs eligible for automated retry and invoke domain retry flow. */
export async function runTextIntegrityRetrySweep(options?: {
  limit?: number;
}): Promise<TextIntegrityRetrySweepResult> {
  const config = await getConfig();
  const baseExt =
    (config.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
  const prisma = await getPrismaClient();
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const policy = getTextIntegrityRetryPolicy(mergedConfig);
  const cutoff = textIntegrityRetryEligibilityCutoff(policy);
  const limit = Math.max(1, options?.limit ?? DEFAULT_SWEEP_LIMIT);

  const candidates = await prisma.checkServiceRun.findMany({
    where: {
      kind: TEXT_INTEGRITY_KIND,
      status: 'error',
      retried: false,
      attempt: { lt: policy.maxAttempts },
      failed_at: { lte: cutoff },
    },
    orderBy: { failed_at: 'asc' },
    take: limit,
  });

  const ctx = await buildRetrySweepContext();
  const result: TextIntegrityRetrySweepResult = {
    scanned: candidates.length,
    retried: 0,
    skippedClaimed: 0,
    skippedEula: 0,
    failed: 0,
    errors: [],
  };

  for (const sourceRun of candidates) {
    const claimed = await tryClaimTextIntegrityRunForRetrySweep(sourceRun.id);
    if (!claimed) {
      result.skippedClaimed += 1;
      continue;
    }

    const scheduledAt = computeTextIntegrityRetryScheduledAt(sourceRun.attempt ?? 1, policy);
    const outcome = await retryTextIntegrityCheckRun(
      ctx,
      sourceRun.work_version_id,
      sourceRun.id,
      'admin',
      { scheduledAt },
    );

    if ('success' in outcome && outcome.success) {
      result.retried += 1;
      continue;
    }

    if ((outcome as { eulaSkip?: boolean }).eulaSkip) {
      await releaseTextIntegrityRunRetrySweepClaim(sourceRun.id);
      result.skippedEula += 1;
      continue;
    }

    await releaseTextIntegrityRunRetrySweepClaim(sourceRun.id);
    result.failed += 1;
    result.errors.push({
      runId: sourceRun.id,
      message: outcome.error?.message ?? 'Retry failed',
    });
  }

  return result;
}

/** Idempotent seed for the built-in retry sweep CronJob (register via admin if seed is skipped). */
export async function seedTextIntegrityRetrySweepCronJob(): Promise<void> {
  const config = await getConfig();
  const apiBase = config.api.tasksCallbackUrl ?? config.api.url ?? '';
  const targetUrl = hooksNotifyBaseUrl('text-integrity/retry-sweep', apiBase.replace(/\/$/, ''));

  await dbSeedBuiltinCronJob(RETRY_SWEEP_CRON_ID, {
    name: 'Text Integrity retry sweep',
    description:
      'Automatically retries eligible failed Text Integrity check runs with exponential backoff.',
    schedule: '*/5 * * * *',
    timezone: 'UTC',
    enabled: true,
    target_type: CronJobTargetType.HTTP,
    target_url: targetUrl,
    http_method: 'POST',
    target_auth: CronJobTargetAuth.HANDSHAKE,
    target_scope: CronEndpointScopes.TEXT_INTEGRITY_RETRY_SWEEP,
    payload: {},
  });
}
