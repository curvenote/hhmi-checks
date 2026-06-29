// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { retryTextIntegrityCheckRun } from './retryCheckRun.server.js';
import { EULA_ADMIN_RETRY_SKIP_MESSAGE } from './eula.server.js';
import { markTextIntegritySourceRunSupersededByRetry } from './runSuperseded.server.js';

const mockFindFirst = vi.fn();
const mockStart = vi.fn();
const mockAssertSubmitter = vi.fn();
const mockAssertOriginal = vi.fn();
const mockGetEulaStatus = vi.fn();

vi.mock('@curvenote/scms-server', () => ({
  getPrismaClient: vi.fn(async () => ({
    checkServiceRun: { findFirst: mockFindFirst },
  })),
}));

vi.mock('./startCheckRun.server.js', () => ({
  startTextIntegrityCheckRun: (...args: unknown[]) => mockStart(...args),
}));

vi.mock('./runSuperseded.server.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    isTextIntegrityRunSupersededByRetry: vi.fn(() => false),
    markTextIntegritySourceRunSupersededByRetry: vi.fn(async () => {}),
  };
});

vi.mock('./eula.server.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    assertSubmitterEulaAccepted: (...args: unknown[]) => mockAssertSubmitter(...args),
    assertOriginalSubmitterEulaCurrent: (...args: unknown[]) => mockAssertOriginal(...args),
    getEulaStatusForUser: (...args: unknown[]) => mockGetEulaStatus(...args),
  };
});

const mockMarkSuperseded = vi.mocked(markTextIntegritySourceRunSupersededByRetry);

const ctx = {
  user: { id: 'admin-user' },
  $config: { app: { extensions: {} } },
} as any;

const failedRun = {
  id: 'run-1',
  kind: 'checks-text-integrity',
  work_version_id: 'wv-1',
  created_by_id: 'original-user',
  data: { status: 'error' },
};

describe('retryTextIntegrityCheckRun', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockStart.mockReset();
    mockAssertSubmitter.mockReset();
    mockAssertOriginal.mockReset();
    mockGetEulaStatus.mockReset();
    mockFindFirst.mockResolvedValue(failedRun);
    mockStart.mockResolvedValue({ ok: true, checkRunId: 'run-2' });
    mockAssertSubmitter.mockResolvedValue(null);
    mockAssertOriginal.mockResolvedValue({ ok: true });
    mockMarkSuperseded.mockReset();
    mockMarkSuperseded.mockResolvedValue(undefined);
  });

  it('blocks user retry when EULA is not accepted', async () => {
    mockAssertSubmitter.mockResolvedValue('Accept the EULA first');
    mockGetEulaStatus.mockResolvedValue({ requireEula: true, eula: { version: '1' } });

    const result = await retryTextIntegrityCheckRun(ctx, 'wv-1', 'run-1', 'user');
    expect(result.status).toBe(400);
    expect(result.error?.message).toContain('EULA');
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('skips admin retry when original submitter EULA is stale', async () => {
    mockAssertOriginal.mockResolvedValue({ ok: false, message: EULA_ADMIN_RETRY_SKIP_MESSAGE });

    const result = await retryTextIntegrityCheckRun(ctx, 'wv-1', 'run-1', 'admin');
    expect(result.status).toBe(400);
    expect((result as { eulaSkip?: boolean }).eulaSkip).toBe(true);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('admin retry preserves original submitter when EULA is current', async () => {
    await retryTextIntegrityCheckRun(ctx, 'wv-1', 'run-1', 'admin');
    expect(mockStart).toHaveBeenCalledWith(
      ctx,
      'wv-1',
      expect.objectContaining({
        createdById: 'original-user',
        invokedById: 'admin-user',
        lineage: expect.objectContaining({ retryOfRunId: 'run-1' }),
      }),
    );
  });

  it('still succeeds when marking the source superseded fails', async () => {
    mockMarkSuperseded.mockRejectedValue(new Error('OCC exhausted'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await retryTextIntegrityCheckRun(ctx, 'wv-1', 'run-1', 'admin');
    expect(result).toMatchObject({ success: true, checkRunId: 'run-2' });
    expect(mockMarkSuperseded).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
