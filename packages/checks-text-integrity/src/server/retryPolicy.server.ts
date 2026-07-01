export type TextIntegrityRetryPolicy = {
  maxAttempts: number;
  minAgeMs: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
};

const DEFAULT_RETRY_POLICY: TextIntegrityRetryPolicy = {
  maxAttempts: 3,
  minAgeMs: 5 * 60 * 1000,
  backoffBaseMs: 60 * 1000,
  backoffMaxMs: 24 * 60 * 60 * 1000,
};

function readPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** Retry policy from extension config (`app.extensions.checks-text-integrity.retryPolicy`). */
export function getTextIntegrityRetryPolicy(
  extensionConfig: Record<string, unknown> | undefined,
): TextIntegrityRetryPolicy {
  const raw = extensionConfig?.retryPolicy;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_RETRY_POLICY;
  }
  const policy = raw as Record<string, unknown>;
  return {
    maxAttempts: readPositiveInt(policy.maxAttempts, DEFAULT_RETRY_POLICY.maxAttempts),
    minAgeMs: readPositiveInt(policy.minAgeMs, DEFAULT_RETRY_POLICY.minAgeMs),
    backoffBaseMs: readPositiveInt(policy.backoffBaseMs, DEFAULT_RETRY_POLICY.backoffBaseMs),
    backoffMaxMs: readPositiveInt(policy.backoffMaxMs, DEFAULT_RETRY_POLICY.backoffMaxMs),
  };
}

/** Exponential backoff from the source run attempt (1-based). */
export function computeTextIntegrityRetryScheduledAt(
  sourceAttempt: number,
  policy: TextIntegrityRetryPolicy,
): string {
  const exponent = Math.max(0, sourceAttempt - 1);
  const delayMs = Math.min(policy.backoffMaxMs, policy.backoffBaseMs * 2 ** exponent);
  return new Date(Date.now() + delayMs).toISOString();
}

export function textIntegrityRetryEligibilityCutoff(
  policy: TextIntegrityRetryPolicy,
  nowMs = Date.now(),
): string {
  return new Date(nowMs - policy.minAgeMs).toISOString();
}
