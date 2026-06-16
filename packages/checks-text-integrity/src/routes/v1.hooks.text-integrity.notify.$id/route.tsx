import type { ActionFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import {
  getPrismaClient,
  safeCheckServiceRunDataUpdate,
} from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import type { TextIntegrityDataSchema } from '../../schema.js';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  hasError,
  parseNotifyWebhookJson,
  textIntegrityDataSchema,
} from '../../schema.js';
import { shouldEnqueuePersistPdfNotify } from '../../server/notify-persist-enqueue.server.js';
import { applyWebhookEvent } from '../../server/stateMachine.server.js';
import { enqueueTextIntegrityPersistPdfJob } from '../../server/enqueue-persist-pdf.server.js';

type CheckServiceRunData<T extends object> = {
  status: string;
  serviceData?: T;
  serviceDataSchema?: Record<string, any>;
};

export function loader() {
  throw error405();
}

export async function action(args: ActionFunctionArgs) {
  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  let rawBody = '';
  try {
    rawBody = await args.request.text();
  } catch {
    return Response.json({ ok: false, error: 'Unable to read request body' }, { status: 400 });
  }

  let json: unknown;
  try {
    json = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseNotifyWebhookJson(json);
  if (parsed.ok === false) {
    return Response.json(
      { ok: false, error: 'Unknown webhook event or payload', issues: parsed.issues },
      { status: 400 },
    );
  }

  if ('noop' in parsed) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const webhook = parsed.webhook;
  const receivedAt = new Date().toISOString();

  let serviceDataAfterWebhook: TextIntegrityDataSchema | undefined;

  try {
    await safeCheckServiceRunDataUpdate(id, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<TextIntegrityDataSchema>;
      const sd = textIntegrityDataSchema.safeParse(current.serviceData);
      const currentServiceData = sd.success ? sd.data : MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;

      const nextServiceData = applyWebhookEvent(currentServiceData, webhook, receivedAt);
      serviceDataAfterWebhook = nextServiceData ?? currentServiceData;

      if (!nextServiceData) {
        return current as Prisma.JsonObject;
      }

      return {
        ...current,
        status: hasError(nextServiceData) ? 'error' : 'healthy',
        serviceData: nextServiceData,
      } as Prisma.JsonObject;
    });
  } catch (err) {
    console.error('[text-integrity notify]', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to update run' },
      { status: 500 },
    );
  }

  if (serviceDataAfterWebhook && shouldEnqueuePersistPdfNotify(webhook, serviceDataAfterWebhook)) {
    const prisma = await getPrismaClient();
    const run = await prisma.checkServiceRun.findUnique({
      where: { id },
      select: { work_version_id: true, created_by_id: true },
    });
    if (run?.work_version_id) {
      await enqueueTextIntegrityPersistPdfJob(
        run.work_version_id,
        id,
        run.created_by_id ?? undefined,
      );
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
