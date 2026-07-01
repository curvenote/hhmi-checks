// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runTextIntegrityRetrySweep } from './retrySweep.server.js';
import { EULA_ADMIN_RETRY_SKIP_MESSAGE } from './eula.server.js';

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockClaim = vi.fn();
const mockRelease = vi.fn();
const mockRetry = vi.fn();
const mockMarkNoAutoRetry = vi.fn();

vi.mock('@curvenote/scms-server', () => ({
  getPrismaClient: vi.fn(async () => ({
    checkServiceRun: { findMany: mockFindMany },
  })),
  getConfig: vi.fn(async () => ({
    api: { submissionsServiceAccount: { id: 'service-account' } },
    app: { extensions: { 'checks-text-integrity': {} } },
  })),
  CronEndpointScopes: {},
  CronJobTargetAuth: { HANDSHAKE: 'HANDSHAKE' },
  CronJobTargetType: { HTTP: 'HTTP' },
  dbSeedBuiltinCronJob: vi.fn(),
  hooksNotifyBaseUrl: vi.fn(),
}));

vi.mock('./config.server.js', () => ({
  getTextIntegrityConfigWithOverrides: vi.fn(async () => ({})),
}));

vi.mock('./retryPolicy.server.js', () => ({
  getTextIntegrityRetryPolicy: vi.fn(() => ({
    maxAttempts: 3,
    minAgeMs: 0,
    backoffBaseMs: 60_000,
    backoffMaxMs: 86_400_000,
  })),
  textIntegrityRetryEligibilityCutoff: vi.fn(() => new Date().toISOString()),
  computeTextIntegrityRetryScheduledAt: vi.fn(() => new Date().toISOString()),
}));

vi.mock('./runSuperseded.server.js', () => ({
  tryClaimTextIntegrityRunForRetrySweep: (...args: unknown[]) => mockClaim(...args),
  releaseTextIntegrityRunRetrySweepClaim: (...args: unknown[]) => mockRelease(...args),
}));

vi.mock('./retryCheckRun.server.js', () => ({
  retryTextIntegrityCheckRun: (...args: unknown[]) => mockRetry(...args),
}));

vi.mock('./checkRunColumns.server.js', () => ({
  markCheckServiceRunNoAutoRetry: (...args: unknown[]) => mockMarkNoAutoRetry(...args),
}));

const sourceRun = {
  id: 'run-1',
  work_version_id: 'wv-1',
  attempt: 1,
};

describe('runTextIntegrityRetrySweep', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockClaim.mockReset();
    mockRelease.mockReset();
    mockRetry.mockReset();
    mockMarkNoAutoRetry.mockReset();
    mockFindMany.mockResolvedValue([sourceRun]);
    mockClaim.mockResolvedValue(true);
    mockMarkNoAutoRetry.mockResolvedValue(undefined);
    mockRelease.mockResolvedValue(undefined);
  });

  it('excludes runs with no_auto_retry from candidate query', async () => {
    mockRetry.mockResolvedValue({ success: true, checkRunId: 'run-2' });
    await runTextIntegrityRetrySweep();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ no_auto_retry: false }),
      }),
    );
  });

  it('marks no_auto_retry when admin retry skips for stale EULA', async () => {
    mockRetry.mockResolvedValue({
      status: 400,
      error: { message: EULA_ADMIN_RETRY_SKIP_MESSAGE },
      eulaSkip: true,
    });

    const result = await runTextIntegrityRetrySweep();
    expect(result.skippedEula).toBe(1);
    expect(mockMarkNoAutoRetry).toHaveBeenCalledWith('run-1');
    expect(mockRelease).toHaveBeenCalledWith('run-1');
  });
});
