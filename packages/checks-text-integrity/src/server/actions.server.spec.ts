// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@curvenote/scms-db';
import type { TextIntegrityDataSchema } from '../schema.js';

const scmsServerMocks = vi.hoisted(() => ({
  getPrismaClient: vi.fn(),
  safeCheckServiceRunDataUpdate: vi.fn(),
}));

vi.mock('@curvenote/scms-server', () => scmsServerMocks);

vi.mock('./config.server.js', () => ({
  getTextIntegrityConfigWithOverrides: vi.fn(async () => ({
    serviceName: 'ithenticate',
    relayInstanceId: 'default',
  })),
}));

import { handleTextIntegrityAction } from './actions.js';

type CheckServiceRunData = {
  serviceData: TextIntegrityDataSchema;
};

function restartForm(checkRunId: string): FormData {
  const formData = new FormData();
  formData.set('checkRunId', checkRunId);
  return formData;
}

function restartArgs(checkRunId: string) {
  return {
    intent: 'restart-similarity-pdf',
    formData: restartForm(checkRunId),
    ctx: {
      user: { id: 'user-1' },
      $config: {
        app: {
          checks: {
            relayBaseUrl: 'https://relay.example.com/',
            relayApiKey: 'secret',
          },
          extensions: {
            'checks-text-integrity': {},
          },
        },
      },
    },
  } as Parameters<typeof handleTextIntegrityAction>[0];
}

describe('handleTextIntegrityAction restart-similarity-pdf', () => {
  const checkRunId = 'run-1';
  let runData: CheckServiceRunData;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();

    runData = {
      serviceData: {
        externalId: 'external-check-1',
        reportPdfId: 'pdf-old',
        similarityReportPdfInvalidated: true,
        stages: {
          submission: { status: 'completed', history: [], timestamp: '2025-01-01T00:00:00Z' },
          processing: { status: 'completed', history: [], timestamp: '2025-01-01T00:00:00Z' },
          reportGeneration: {
            status: 'error',
            history: [],
            timestamp: '2025-01-01T00:00:00Z',
            error: 'previous PDF generation failed',
          },
        },
      },
    };

    scmsServerMocks.getPrismaClient.mockResolvedValue({
      checkServiceRun: {
        findUnique: vi.fn(async () => ({ id: checkRunId, data: runData })),
      },
    });
    scmsServerMocks.safeCheckServiceRunDataUpdate.mockImplementation(
      async (_id: string, update: (data?: Prisma.JsonValue) => Prisma.JsonObject | null) => {
        const next = update(runData as Prisma.JsonValue);
        if (next) runData = next as CheckServiceRunData;
      },
    );
  });

  it('does not issue a second relay start while a previous restart is already processing', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        result: { pdf_id: 'pdf-new' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(handleTextIntegrityAction(restartArgs(checkRunId))).resolves.toEqual({
      success: true,
    });
    await expect(handleTextIntegrityAction(restartArgs(checkRunId))).resolves.toEqual({
      success: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.example.com/api/v1/services/ithenticate/instances/default/check/external-check-1/report/pdf/start',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret',
        },
        body: '{}',
      }),
    );
    expect(runData.serviceData.stages.reportGeneration?.status).toBe('processing');
    expect(runData.serviceData.reportPdfId).toBe('pdf-new');
  });
});
