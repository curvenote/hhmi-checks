// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@curvenote/scms-db';
import type { TextIntegrityDataSchema } from '../schema.js';

const scmsServerMocks = vi.hoisted(() => ({
  getPrismaClient: vi.fn(),
}));

const checkRunColumnMocks = vi.hoisted(() => ({
  safeCheckServiceRunPatch: vi.fn(),
  patchTextIntegrityRunServiceData: vi.fn(),
  checkRunCoarseStatus: vi.fn((s: string) => s),
  errorColumnPatch: vi.fn(() => ({ status: 'error' })),
}));

const eulaMocks = vi.hoisted(() => ({
  assertSubmitterEulaAccepted: vi.fn(),
  getEulaStatusForUser: vi.fn(),
}));

const analyticsMocks = vi.hoisted(() => ({
  trackTextIntegrityRunStartFailed: vi.fn(),
}));

const startCheckRunMocks = vi.hoisted(() => ({
  startTextIntegrityCheckRun: vi.fn(),
}));

vi.mock('@curvenote/scms-server', () => scmsServerMocks);

vi.mock('./checkRunColumns.server.js', () => checkRunColumnMocks);

vi.mock('./config.server.js', () => ({
  getTextIntegrityConfigWithOverrides: vi.fn(async () => ({
    serviceName: 'ithenticate',
    relayInstanceId: 'default',
  })),
}));

const scopeMocks = vi.hoisted(() => ({
  guardTextIntegrityWorkCheckScopes: vi.fn(async (ctx: unknown) => ({
    ok: true as const,
    ctx,
    workId: 'work-1',
  })),
}));

vi.mock('./checkWorkScopes.server.js', () => ({
  guardTextIntegrityWorkCheckScopes: scopeMocks.guardTextIntegrityWorkCheckScopes,
  TEXT_INTEGRITY_DISPATCH_INTENTS: new Set([
    'accept-eula',
    'execute',
    'retry',
    'refresh-viewer-url',
    'relay-status',
    'restart-similarity-pdf',
  ]),
}));

vi.mock('./eula.server.js', () => ({
  acceptEulaAtProvider: vi.fn(),
  assertSubmitterEulaAccepted: eulaMocks.assertSubmitterEulaAccepted,
  buildViewerEulaPayload: vi.fn(),
  getEulaStatusForUser: eulaMocks.getEulaStatusForUser,
  recordUserEulaAcceptance: vi.fn(),
}));

vi.mock('./analytics.server.js', () => ({
  trackTextIntegrityRunStartFailed: analyticsMocks.trackTextIntegrityRunStartFailed,
}));

vi.mock('./startCheckRun.server.js', () => ({
  startTextIntegrityCheckRun: startCheckRunMocks.startTextIntegrityCheckRun,
}));

vi.mock('./retryCheckRun.server.js', () => ({
  retryTextIntegrityCheckRun: vi.fn(),
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
    workVersionId: 'wv-1',
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
  let findCheckRun: ReturnType<typeof vi.fn>;

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

    findCheckRun = vi.fn(async () => ({
      id: checkRunId,
      work_version_id: 'wv-1',
      kind: 'checks-text-integrity',
      data: runData,
    }));
    scmsServerMocks.getPrismaClient.mockResolvedValue({
      checkServiceRun: {
        findFirst: findCheckRun,
      },
    });
    checkRunColumnMocks.safeCheckServiceRunPatch.mockImplementation(
      async (_id: string, update: (data?: Prisma.JsonValue) => Prisma.JsonObject | null) => {
        const next = update(runData as Prisma.JsonValue);
        if (next) runData = next as CheckServiceRunData;
        return { id: checkRunId, data: runData };
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

  it('requires the run to belong to the authorized work version', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        result: { pdf_id: 'pdf-new' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    findCheckRun.mockResolvedValueOnce(null);

    await expect(handleTextIntegrityAction(restartArgs(checkRunId))).resolves.toEqual({
      error: { type: 'general', message: 'Check run not found' },
      status: 404,
    });

    expect(findCheckRun).toHaveBeenCalledWith({
      where: {
        id: checkRunId,
        work_version_id: 'wv-1',
        kind: 'checks-text-integrity',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('handleTextIntegrityAction execute', () => {
  const workVersionId = 'wv-1';
  let createCheckRun: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    createCheckRun = vi.fn(async () => ({ id: 'failed-run-1' }));
    scmsServerMocks.getPrismaClient.mockResolvedValue({
      checkServiceRun: {
        create: createCheckRun,
      },
    });
    eulaMocks.getEulaStatusForUser.mockResolvedValue({
      requireEula: true,
      eula: { version: '2024-01' },
    });
    startCheckRunMocks.startTextIntegrityCheckRun.mockResolvedValue({
      ok: true,
      checkRunId: 'run-1',
    });
  });

  it('emits CHECKS_RUN_START_FAILED when execute is blocked by EULA', async () => {
    const eulaBlock = 'Accept the Text Integrity EULA before running this check.';
    eulaMocks.assertSubmitterEulaAccepted.mockResolvedValue(eulaBlock);

    await expect(
      handleTextIntegrityAction({
        intent: 'execute',
        workVersionId,
        ctx: {
          user: { id: 'user-1' },
          $config: {
            app: {
              extensions: {
                'checks-text-integrity': {},
              },
            },
          },
        },
      } as Parameters<typeof handleTextIntegrityAction>[0]),
    ).resolves.toEqual({
      error: { type: 'general', message: eulaBlock },
      status: 400,
      requiresEula: true,
      requireEula: true,
      eula: { version: '2024-01' },
    });

    expect(createCheckRun).toHaveBeenCalledOnce();
    expect(analyticsMocks.trackTextIntegrityRunStartFailed).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'user-1' } }),
      workVersionId,
      expect.any(String),
      eulaBlock,
      expect.objectContaining({ trigger: 'checks_page' }),
    );
    expect(startCheckRunMocks.startTextIntegrityCheckRun).not.toHaveBeenCalled();
  });
});
