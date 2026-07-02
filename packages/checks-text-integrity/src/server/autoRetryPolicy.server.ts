/** Defaults for `app.extensions.checks-text-integrity.autoRetry` (also in app-config.development.yml). */
export const DEFAULT_TEXT_INTEGRITY_AUTO_RETRY = {
  enabled: true,
  backoff: {
    fixedIntervalMs: 600_000, // 10 min — phase 1 spacing
    fixedRetryCount: 3,
    stepBaseDelayMs: 3_600_000, // 1 h — first delay after fixed phase
    multiplier: 2,
    maxStepDelayMs: 43_200_000, // 12 h cap per retry interval
  },
  limits: {
    maxRetryWindowMs: 259_200_000, // 3 days from root failure
    maxAttempts: 20,
  },
  sweep: {
    limit: 25,
  },
} as const;

export type TextIntegrityAutoRetryBackoff = {
  fixedIntervalMs: number;
  fixedRetryCount: number;
  stepBaseDelayMs: number;
  multiplier: number;
  maxStepDelayMs: number;
};

export type TextIntegrityAutoRetryLimits = {
  maxRetryWindowMs: number;
  maxAttempts: number;
};

export type TextIntegrityAutoRetryConfig = {
  enabled: boolean;
  backoff: TextIntegrityAutoRetryBackoff;
  limits: TextIntegrityAutoRetryLimits;
  sweep: { limit: number };
};

function readPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function readSection(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as Record<string, unknown>;
}

/** Auto-retry policy from `app.extensions.checks-text-integrity.autoRetry`. */
export function getTextIntegrityAutoRetryConfig(
  extensionConfig: Record<string, unknown> | undefined,
): TextIntegrityAutoRetryConfig {
  const defaults = DEFAULT_TEXT_INTEGRITY_AUTO_RETRY;
  const raw = readSection(extensionConfig?.autoRetry) ?? {};
  const backoffRaw = readSection(raw.backoff) ?? {};
  const limitsRaw = readSection(raw.limits) ?? {};
  const sweepRaw = readSection(raw.sweep) ?? {};

  return {
    enabled: readBoolean(raw.enabled, defaults.enabled),
    backoff: {
      fixedIntervalMs: readPositiveInt(
        backoffRaw.fixedIntervalMs,
        defaults.backoff.fixedIntervalMs,
      ),
      fixedRetryCount: readPositiveInt(
        backoffRaw.fixedRetryCount,
        defaults.backoff.fixedRetryCount,
      ),
      stepBaseDelayMs: readPositiveInt(
        backoffRaw.stepBaseDelayMs,
        defaults.backoff.stepBaseDelayMs,
      ),
      multiplier: readPositiveInt(backoffRaw.multiplier, defaults.backoff.multiplier),
      maxStepDelayMs: readPositiveInt(backoffRaw.maxStepDelayMs, defaults.backoff.maxStepDelayMs),
    },
    limits: {
      maxRetryWindowMs: readPositiveInt(
        limitsRaw.maxRetryWindowMs,
        defaults.limits.maxRetryWindowMs,
      ),
      maxAttempts: readPositiveInt(limitsRaw.maxAttempts, defaults.limits.maxAttempts),
    },
    sweep: {
      limit: readPositiveInt(sweepRaw.limit, defaults.sweep.limit),
    },
  };
}

/** Minimum wait after `failed_at` before the next auto-retry for this attempt (ms). */
export function delayBeforeRetryMs(
  attempt: number,
  backoff: TextIntegrityAutoRetryBackoff,
): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  if (safeAttempt <= backoff.fixedRetryCount) {
    return backoff.fixedIntervalMs;
  }
  const step = safeAttempt - backoff.fixedRetryCount;
  const exponent = step - 1;
  return Math.min(backoff.maxStepDelayMs, backoff.stepBaseDelayMs * backoff.multiplier ** exponent);
}

export type TextIntegrityAutoRetryRunTiming = {
  attempt?: number | null;
  failed_at?: string | null;
};

/** Whether a failed run is eligible for auto-retry at `nowMs`. */
export function isTextIntegrityRunAutoRetryEligible(
  run: TextIntegrityAutoRetryRunTiming,
  rootFailedAt: string | null | undefined,
  config: TextIntegrityAutoRetryConfig,
  nowMs = Date.now(),
): boolean {
  if (!config.enabled) return false;

  const attempt = run.attempt ?? 1;
  if (attempt >= config.limits.maxAttempts) return false;

  const failedAt = run.failed_at?.trim();
  if (!failedAt) return false;

  const failedMs = Date.parse(failedAt);
  if (Number.isNaN(failedMs)) return false;

  const eligibleAfterMs = failedMs + delayBeforeRetryMs(attempt, config.backoff);
  if (nowMs < eligibleAfterMs) return false;

  const rootAt = rootFailedAt?.trim();
  if (rootAt) {
    const rootMs = Date.parse(rootAt);
    if (!Number.isNaN(rootMs) && nowMs > rootMs + config.limits.maxRetryWindowMs) {
      return false;
    }
  }

  return true;
}
