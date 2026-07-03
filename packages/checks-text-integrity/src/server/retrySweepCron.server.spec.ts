// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID,
  getTextIntegrityRetrySweepCronStatus,
  installTextIntegrityRetrySweepCronJob,
} from './retrySweep.server.js';

const mockDbGetCronJob = vi.fn();
const mockDbSeedBuiltinCronJob = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('@curvenote/scms-server', () => ({
  CronJobTargetAuth: { HANDSHAKE: 'HANDSHAKE' },
  CronJobTargetType: { HTTP: 'HTTP' },
  dbGetCronJob: (...args: unknown[]) => mockDbGetCronJob(...args),
  dbSeedBuiltinCronJob: (...args: unknown[]) => mockDbSeedBuiltinCronJob(...args),
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  getPrismaClient: vi.fn(),
  hooksNotifyBaseUrl: vi.fn((path: string, base: string) => `${base.replace(/\/$/, '')}/${path}`),
}));

vi.mock('./config.server.js', () => ({
  getTextIntegrityConfigWithOverrides: vi.fn(async (base: Record<string, unknown>) => base),
}));

vi.mock('./autoRetryPolicy.server.js', () => ({
  DEFAULT_TEXT_INTEGRITY_AUTO_RETRY: {
    enabled: true,
    backoff: {},
    limits: { maxAttempts: 20 },
    sweep: { limit: 25 },
  },
  getTextIntegrityAutoRetryConfig: vi.fn(() => ({
    enabled: true,
    backoff: {},
    limits: { maxAttempts: 20 },
    sweep: { limit: 25 },
  })),
}));

vi.mock('./runSuperseded.server.js', () => ({
  tryClaimTextIntegrityRunForRetrySweep: vi.fn(),
  releaseTextIntegrityRunRetrySweepClaim: vi.fn(),
}));

vi.mock('./retryCheckRun.server.js', () => ({
  retryTextIntegrityCheckRun: vi.fn(),
}));

vi.mock('./checkRunColumns.server.js', () => ({
  markCheckServiceRunNoAutoRetry: vi.fn(),
}));

describe('retry sweep cron admin helpers', () => {
  beforeEach(() => {
    mockDbGetCronJob.mockReset();
    mockDbSeedBuiltinCronJob.mockReset();
    mockGetConfig.mockReset();
    mockGetConfig.mockResolvedValue({
      api: { url: 'https://example.test/v1', tasksCallbackUrl: 'https://example.test/v1' },
    });
  });

  it('reports not installed when CronJob row is missing', async () => {
    mockDbGetCronJob.mockResolvedValue(null);
    await expect(getTextIntegrityRetrySweepCronStatus()).resolves.toEqual({ installed: false });
    expect(mockDbGetCronJob).toHaveBeenCalledWith(TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID);
  });

  it('maps installed CronJob fields for admin display', async () => {
    mockDbGetCronJob.mockResolvedValue({
      id: TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID,
      name: 'Text Integrity retry sweep',
      schedule: '*/5 * * * *',
      enabled: true,
      target_url: 'https://example.test/v1/hooks/text-integrity/retry-sweep',
      target_scope: 'POST:/v1/hooks/text-integrity/retry-sweep',
      last_run_at: '2026-07-01T12:00:00.000Z',
      last_status: 'SUCCESS',
      next_run_at: '2026-07-01T12:05:00.000Z',
    });

    await expect(getTextIntegrityRetrySweepCronStatus()).resolves.toEqual({
      installed: true,
      cronJob: {
        id: TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID,
        name: 'Text Integrity retry sweep',
        schedule: '*/5 * * * *',
        enabled: true,
        targetUrl: 'https://example.test/v1/hooks/text-integrity/retry-sweep',
        targetScope: 'POST:/v1/hooks/text-integrity/retry-sweep',
        lastRunAt: '2026-07-01T12:00:00.000Z',
        lastStatus: 'SUCCESS',
        nextRunAt: '2026-07-01T12:05:00.000Z',
      },
    });
  });

  it('install seeds builtin cron then returns status', async () => {
    mockDbSeedBuiltinCronJob.mockResolvedValue(undefined);
    mockDbGetCronJob.mockResolvedValue({
      id: TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID,
      name: 'Text Integrity retry sweep',
      schedule: '*/5 * * * *',
      enabled: true,
      target_url: 'https://example.test/v1/hooks/text-integrity/retry-sweep',
      target_scope: 'POST:/v1/hooks/text-integrity/retry-sweep',
      last_run_at: null,
      last_status: null,
      next_run_at: '2026-07-01T12:05:00.000Z',
    });

    const status = await installTextIntegrityRetrySweepCronJob();
    expect(mockDbSeedBuiltinCronJob).toHaveBeenCalledWith(
      TEXT_INTEGRITY_RETRY_SWEEP_CRON_ID,
      expect.objectContaining({
        name: 'Text Integrity retry sweep',
        schedule: '*/5 * * * *',
        target_scope: 'POST:/v1/hooks/text-integrity/retry-sweep',
      }),
    );
    expect(status.installed).toBe(true);
  });
});
