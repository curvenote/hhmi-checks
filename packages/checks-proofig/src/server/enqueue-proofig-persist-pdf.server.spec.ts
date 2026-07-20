// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobStatus } from '@curvenote/scms-db';
import { KnownState, MINIMAL_PROOFIG_SERVICE_DATA } from '../schema.js';

const mockEnqueueAndDispatchJob = vi.fn();
const mockGetConfig = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('@curvenote/scms-server', () => ({
  getPrismaClient: vi.fn(async () => ({
    checkServiceRun: { findUnique: mockFindUnique },
    job: { findFirst: mockFindFirst },
  })),
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  enqueueAndDispatchJob: (...args: unknown[]) => mockEnqueueAndDispatchJob(...args),
}));

vi.mock('uuidv7', () => ({
  uuidv7: () => 'job-new-1',
}));

import { enqueueProofigPersistPdfIfNeeded } from './enqueue-proofig-persist-pdf.server.js';

function finalReportServiceData(overrides: Record<string, unknown> = {}) {
  return {
    ...MINIMAL_PROOFIG_SERVICE_DATA,
    reportId: 'report-1',
    reportUrl: 'https://proofig.example/report/1',
    summary: {
      state: KnownState.ReportClean,
      receivedAt: '2025-01-01T00:00:00Z',
    },
    stages: {
      ...MINIMAL_PROOFIG_SERVICE_DATA.stages,
      resultsReview: {
        status: 'completed',
        history: [],
        timestamp: '2025-01-01T00:00:00Z',
        outcome: 'clean',
      },
    },
    ...overrides,
  };
}

describe('enqueueProofigPersistPdfIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue({
      api: { submissionsServiceAccount: { id: 'svc-1' } },
    });
    mockEnqueueAndDispatchJob.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue(null);
  });

  it('skips when a PROOFIG_PERSIST_PDF job is already in flight for the run', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: '11111111-1111-4111-8111-111111111111',
      data: { serviceData: finalReportServiceData() },
    });
    mockFindFirst.mockResolvedValue({ id: 'job-existing' });

    const result = await enqueueProofigPersistPdfIfNeeded('run-1');

    expect(result).toEqual({ enqueued: false, reason: 'already-in-flight' });
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          job_type: 'PROOFIG_PERSIST_PDF',
          status: {
            in: [JobStatus.BLOCKED, JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.SCHEDULED],
          },
          payload: {
            path: ['check_service_run_id'],
            equals: 'run-1',
          },
        }),
      }),
    );
    expect(mockEnqueueAndDispatchJob).not.toHaveBeenCalled();
  });

  it('enqueues when persist is needed and no job is in flight', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: '11111111-1111-4111-8111-111111111111',
      data: { serviceData: finalReportServiceData() },
    });

    const result = await enqueueProofigPersistPdfIfNeeded('run-1');

    expect(result).toEqual({ enqueued: true, jobId: 'job-new-1' });
    expect(mockEnqueueAndDispatchJob).toHaveBeenCalledTimes(1);
  });

  it('bypasses the in-flight check when force is true', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'run-1',
      kind: 'proofig',
      work_version_id: '11111111-1111-4111-8111-111111111111',
      data: {
        serviceData: finalReportServiceData({
          proofigReportStored: true,
          storedReportId: 'report-1',
        }),
      },
    });
    mockFindFirst.mockResolvedValue({ id: 'job-existing' });

    const result = await enqueueProofigPersistPdfIfNeeded('run-1', { force: true });

    expect(result).toEqual({ enqueued: true, jobId: 'job-new-1' });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockEnqueueAndDispatchJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ force: true }),
      }),
    );
  });
});
