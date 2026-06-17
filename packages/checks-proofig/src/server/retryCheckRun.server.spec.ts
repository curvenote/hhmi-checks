// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { retryProofigCheckRun } from './retryCheckRun.server.js';

const mockFindFirst = vi.fn();
const mockStart = vi.fn();

vi.mock('@curvenote/scms-server', () => ({
  getPrismaClient: vi.fn(async () => ({
    checkServiceRun: { findFirst: mockFindFirst },
  })),
}));

vi.mock('./startCheckRun.server.js', () => ({
  startProofigCheckRun: (...args: unknown[]) => mockStart(...args),
}));

const ctx = {
  user: { id: 'admin-user' },
  $config: { app: { extensions: {} } },
} as any;

describe('retryProofigCheckRun', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockStart.mockReset();
  });

  it('rejects when source run is not failed', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: 'wv-1',
      created_by_id: 'user-1',
      data: { status: 'processing', serviceData: { stages: {} } },
    });

    const result = await retryProofigCheckRun(ctx, 'wv-1', 'run-1', 'user');
    expect(result.status).toBe(400);
    expect(result.error?.message).toContain('Only failed');
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('user retry uses invoking user as submitter', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: 'wv-1',
      created_by_id: 'original-user',
      data: { status: 'error' },
    });
    mockStart.mockResolvedValue({ ok: true, checkRunId: 'run-2' });

    const result = await retryProofigCheckRun(ctx, 'wv-1', 'run-1', 'user');
    expect(result).toMatchObject({ success: true, checkRunId: 'run-2' });
    expect(mockStart).toHaveBeenCalledWith(
      ctx,
      'wv-1',
      expect.objectContaining({
        createdById: 'admin-user',
        invokedById: 'admin-user',
        lineage: expect.objectContaining({ retryOfRunId: 'run-1' }),
      }),
    );
  });

  it('admin retry preserves original submitter', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: 'wv-1',
      created_by_id: 'original-user',
      data: { status: 'error' },
    });
    mockStart.mockResolvedValue({ ok: true, checkRunId: 'run-2' });

    await retryProofigCheckRun(ctx, 'wv-1', 'run-1', 'admin');
    expect(mockStart).toHaveBeenCalledWith(
      ctx,
      'wv-1',
      expect.objectContaining({
        createdById: 'original-user',
        invokedById: 'admin-user',
      }),
    );
  });
});
