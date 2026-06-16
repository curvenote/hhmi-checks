// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobStatus } from '@curvenote/scms-db';

const mockApplyDocumentPreparationFromConverterJob = vi.fn();
const mockDbUpdateJob = vi.fn();

vi.mock('../applyDocumentPreparationFromConverterJob.server.js', () => ({
  applyDocumentPreparationFromConverterJob: (...args: unknown[]) =>
    mockApplyDocumentPreparationFromConverterJob(...args),
}));

vi.mock('@curvenote/scms-server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@curvenote/scms-server')>();
  return {
    ...actual,
    jobs: {
      ...actual.jobs,
      dbUpdateJob: (...args: unknown[]) => mockDbUpdateJob(...args),
    },
  };
});

import {
  PROOFIG_SYNC_DOCUMENT_PREPARATION,
  proofigSyncDocumentPreparationHandler,
} from './proofig-sync-document-preparation.server.js';

describe('proofigSyncDocumentPreparationHandler', () => {
  beforeEach(() => {
    mockApplyDocumentPreparationFromConverterJob.mockReset();
    mockDbUpdateJob.mockReset();
    mockDbUpdateJob.mockImplementation(async (id, update) => ({ id, ...update }));
  });

  it('marks the job COMPLETED when document preparation is synced', async () => {
    mockApplyDocumentPreparationFromConverterJob.mockResolvedValue({ ok: true, updated: true });

    await proofigSyncDocumentPreparationHandler({} as any, {
      id: 'sync-job-1',
      job_type: PROOFIG_SYNC_DOCUMENT_PREPARATION,
      payload: { proofig_run_id: 'run-1' },
    });

    expect(mockApplyDocumentPreparationFromConverterJob).toHaveBeenCalledWith('run-1');
    expect(mockDbUpdateJob).toHaveBeenCalledWith('sync-job-1', {
      status: JobStatus.COMPLETED,
      message: 'Proofig document preparation synced from converter job',
      results: { updated: true },
    });
  });

  it('marks the job FAILED when sync returns an error', async () => {
    mockApplyDocumentPreparationFromConverterJob.mockResolvedValue({
      ok: false,
      message: 'Converter job missing',
    });

    await proofigSyncDocumentPreparationHandler({} as any, {
      id: 'sync-job-2',
      job_type: PROOFIG_SYNC_DOCUMENT_PREPARATION,
      payload: { proofig_run_id: 'run-2' },
    });

    expect(mockDbUpdateJob).toHaveBeenCalledWith('sync-job-2', {
      status: JobStatus.FAILED,
      message: 'Converter job missing',
    });
  });
});
