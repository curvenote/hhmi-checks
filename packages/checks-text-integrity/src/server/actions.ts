import { uuidv7 as uuid } from 'uuidv7';
import { getPrismaClient, jobs, registerExtensionJobs } from '@curvenote/scms-server';
import type { Context as ServerContext } from '@curvenote/scms-server';
import {
  type ExtensionCheckHandleActionArgs,
  type ExtensionCheckHandleActionResult,
  type ExtensionCheckStatusArgs,
  hasDocxInMetadata,
  hasPdfInMetadata,
} from '@curvenote/scms-core';
import type { Prisma } from '@curvenote/scms-db';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA } from '../schema.js';
import { markSubmissionError } from './stateMachine.server.js';
import { TEXT_INTEGRITY_SUBMIT } from './jobs/text-integrity-submit.server.js';

/**
 * Handle Text Integrity check actions.
 * Intent checks-text-integrity:execute creates a check run and enqueues TEXT_INTEGRITY_SUBMIT job.
 */
export async function handleTextIntegrityAction(
  args: ExtensionCheckHandleActionArgs,
): Promise<ExtensionCheckHandleActionResult> {
  const { intent: rawIntent, workVersionId, ctx, serverExtensions } = args;
  const intent = rawIntent.startsWith('checks-text-integrity:')
    ? rawIntent.split(':', 2)[1]
    : rawIntent;

  if (intent === 'execute' && ctx) {
    if (!workVersionId) {
      return {
        error: {
          type: 'general',
          message: 'Work version ID is required for Text Integrity execute',
        },
        status: 400,
      };
    }

    const prisma = await getPrismaClient();
    const workVersion = await prisma.workVersion.findUnique({
      where: { id: workVersionId },
    });
    if (!workVersion) {
      return { error: { type: 'general', message: 'Work version not found', status: 404 } };
    }

    const metadata =
      workVersion.metadata != null && typeof workVersion.metadata === 'object'
        ? workVersion.metadata
        : null;
    const hasPdf = hasPdfInMetadata(metadata);
    const hasDocx = hasDocxInMetadata(metadata);
    if (!hasPdf && !hasDocx) {
      return {
        error: {
          type: 'general',
          message: 'Text Integrity requires a PDF or a Word document (.docx) on this version.',
        },
        status: 400,
      };
    }

    const timestamp = new Date().toISOString();
    const run = await prisma.checkServiceRun.create({
      data: {
        id: uuid(),
        date_created: timestamp,
        date_modified: timestamp,
        kind: 'checks-text-integrity',
        work_version_id: workVersionId,
        data: {
          status: 'healthy',
          serviceDataSchema: {},
          serviceData: MINIMAL_TEXT_INTEGRITY_SERVICE_DATA as Prisma.JsonObject,
        },
      },
    });
    const checkRunId = run.id;

    const extensionJobs = registerExtensionJobs(serverExtensions ?? []);
    try {
      await jobs.invoke(
        ctx as ServerContext,
        {
          id: uuid(),
          job_type: TEXT_INTEGRITY_SUBMIT,
          payload: {
            work_version_id: workVersionId,
            text_integrity_run_id: checkRunId,
          },
          invoked_by_id: ctx.user?.id,
          activity_type: 'CHECK_STARTED',
          activity_data: { check: { kind: 'checks-text-integrity' } },
        },
        extensionJobs,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Text Integrity submit job failed';
      console.error('TEXT_INTEGRITY_SUBMIT job create failed', err);
      await prisma.checkServiceRun.update({
        where: { id: checkRunId },
        data: {
          data: {
            status: 'error',
            serviceData: markSubmissionError(undefined, message) as unknown as Prisma.JsonObject,
          },
        },
      });
      return {
        error: { type: 'general', message },
        status: 500,
      };
    }

    return { success: true };
  }

  if (intent !== 'execute') {
    return {
      error: { type: 'general', message: 'Unknown intent' },
      status: 400,
    };
  }

  return {
    error: {
      type: 'general',
      message: 'Text Integrity execute requires context and job creator',
    },
    status: 400,
  };
}

/**
 * Return check run status from DB.
 */
export async function textIntegrityStatus(args: ExtensionCheckStatusArgs): Promise<Response> {
  const { checkRunId } = args;
  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({
    where: { id: checkRunId },
  });
  if (!run) {
    return Response.json({ status: 'unknown', serviceData: undefined });
  }
  const runData = run.data as Record<string, unknown> | null;
  const status = (runData?.status as string) ?? 'unknown';
  const serviceData = runData?.serviceData;
  return Response.json({ status, serviceData });
}
