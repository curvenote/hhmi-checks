import { uuidv7 as uuid } from 'uuidv7';
import {
  enqueueAndDispatchJob,
  getPrismaClient,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import {
  hasDocxInMetadata,
  hasPdfInMetadata,
  type ExtensionCheckHandleActionArgs,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  parseServiceManifestSnapshot,
  type TextIntegrityDataSchema,
} from '../schema.js';
import { markSubmissionError } from './stateMachine.server.js';
import { TEXT_INTEGRITY_SUBMIT } from './jobs/text-integrity-submit.server.js';
import { getTextIntegrityConfigWithOverrides } from './config.server.js';

export type TextIntegrityCheckRunLineage = {
  retryOfRunId?: string;
  retriedAt?: string;
  retriedByUserId?: string;
};

export type StartTextIntegrityCheckRunResult =
  | { ok: true; checkRunId: string }
  | { ok: false; message: string; status: number; checkRunId?: string };

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
  serviceDataSchema?: Record<string, unknown>;
};

type StartTextIntegrityCheckRunOptions = {
  createdById?: string;
  invokedById?: string;
  lineage?: TextIntegrityCheckRunLineage;
};

async function recordTextIntegrityStartFailure(
  workVersionId: string,
  createdById: string | undefined,
  message: string,
  mergedConfig: Record<string, unknown>,
): Promise<string> {
  const prisma = await getPrismaClient();
  const manifest = parseServiceManifestSnapshot(mergedConfig.manifest);
  const serviceData = markSubmissionError(
    {
      ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
      ...(manifest ? { manifest } : {}),
    },
    message,
  );
  const timestamp = new Date().toISOString();
  const run = await prisma.checkServiceRun.create({
    data: {
      id: uuid(),
      date_created: timestamp,
      date_modified: timestamp,
      kind: 'checks-text-integrity',
      work_version_id: workVersionId,
      created_by_id: createdById,
      data: {
        status: 'error',
        serviceDataSchema: {},
        serviceData: serviceData as Prisma.JsonObject,
      },
    },
  });
  return run.id;
}

/**
 * Create a Text Integrity check run and enqueue TEXT_INTEGRITY_SUBMIT.
 */
export async function startTextIntegrityCheckRun(
  ctx: NonNullable<ExtensionCheckHandleActionArgs['ctx']>,
  workVersionId: string,
  options: StartTextIntegrityCheckRunOptions = {},
): Promise<StartTextIntegrityCheckRunResult> {
  const prisma = await getPrismaClient();
  const workVersion = await prisma.workVersion.findUnique({
    where: { id: workVersionId },
  });
  if (!workVersion) {
    return { ok: false, message: 'Work version not found', status: 404 };
  }

  const metadata =
    workVersion.metadata != null && typeof workVersion.metadata === 'object'
      ? workVersion.metadata
      : null;
  const hasPdf = hasPdfInMetadata(metadata);
  const hasDocx = hasDocxInMetadata(metadata);
  const baseExt =
    (ctx.$config?.app?.extensions?.['checks-text-integrity'] as Record<string, unknown>) ?? {};
  const mergedConfig = await getTextIntegrityConfigWithOverrides(baseExt, prisma);
  const createdById = options.createdById ?? ctx.user?.id ?? undefined;

  if (!hasPdf && !hasDocx) {
    const noFilesMessage =
      'Text Integrity requires a PDF or a Word document (.docx) on this version.';
    const checkRunId = await recordTextIntegrityStartFailure(
      workVersionId,
      createdById,
      noFilesMessage,
      mergedConfig,
    );
    return { ok: false, message: noFilesMessage, status: 400, checkRunId };
  }

  const manifest = parseServiceManifestSnapshot(mergedConfig.manifest);
  const timestamp = new Date().toISOString();
  const initialServiceData: TextIntegrityDataSchema = {
    ...MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
    ...(manifest ? { manifest } : {}),
    ...(options.lineage?.retryOfRunId
      ? {
          retryOfRunId: options.lineage.retryOfRunId,
          retriedAt: options.lineage.retriedAt ?? timestamp,
          ...(options.lineage.retriedByUserId
            ? { retriedByUserId: options.lineage.retriedByUserId }
            : {}),
        }
      : {}),
  };

  const run = await prisma.checkServiceRun.create({
    data: {
      id: uuid(),
      date_created: timestamp,
      date_modified: timestamp,
      kind: 'checks-text-integrity',
      work_version_id: workVersionId,
      created_by_id: createdById,
      data: {
        status: 'healthy',
        serviceDataSchema: {},
        serviceData: initialServiceData as Prisma.JsonObject,
      },
    },
  });
  const checkRunId = run.id;
  const invokedById = options.invokedById ?? ctx.user?.id;

  try {
    await enqueueAndDispatchJob({
      job_id: uuid(),
      job_type: TEXT_INTEGRITY_SUBMIT,
      payload: {
        work_version_id: workVersionId,
        check_service_run_id: checkRunId,
      },
      invoked_by_id: invokedById,
      activity_type: 'CHECK_STARTED',
      activity_data: { check: { kind: 'checks-text-integrity' } },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Text Integrity submit job failed';
    console.error('TEXT_INTEGRITY_SUBMIT job create failed', err);
    await safeCheckServiceRunDataUpdate(checkRunId, (data?: Prisma.JsonValue) => {
      const current = (data ?? {}) as CheckServiceRunData;
      return {
        ...current,
        status: 'error',
        serviceData: markSubmissionError(current.serviceData ?? initialServiceData, message),
      } as Prisma.JsonObject;
    });
    return { ok: false, message, status: 500, checkRunId };
  }

  return { ok: true, checkRunId };
}
