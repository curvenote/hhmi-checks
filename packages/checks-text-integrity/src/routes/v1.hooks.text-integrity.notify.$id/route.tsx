import type { ActionFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import type { TextIntegrityDataSchema } from '../../schema.js';
import {
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  hasError,
  parseNotifyWebhookJson,
  textIntegrityDataSchema,
} from '../../schema.js';
import { applyWebhookEvent } from '../../server/stateMachine.server.js';

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

  try {
    await safeCheckServiceRunDataUpdate(id, (runData?: Prisma.JsonValue) => {
      const current = (runData ?? {}) as CheckServiceRunData<TextIntegrityDataSchema>;
      const parsed = textIntegrityDataSchema.safeParse(current.serviceData);
      const currentServiceData = parsed.success ? parsed.data : MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;

      const nextServiceData = applyWebhookEvent(currentServiceData, webhook, receivedAt);

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

  return Response.json({ ok: true }, { status: 200 });
}
