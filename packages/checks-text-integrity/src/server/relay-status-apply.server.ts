import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import type { RelayNotifyEnvelope } from '@curvenote/check-relay-types';
import {
  hasError,
  MINIMAL_TEXT_INTEGRITY_SERVICE_DATA,
  parseNotifyWebhookJson,
  textIntegrityDataSchema,
} from '../schema.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { applyWebhookEvent } from './stateMachine.server.js';

type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
  serviceDataSchema?: Record<string, unknown>;
};

/**
 * Apply relay check-status notify envelopes (same shapes as ingest `notify_url`) to a run.
 */
export async function applyRelayCheckStatusEnvelopes(
  checkServiceRunId: string,
  envelopes: readonly RelayNotifyEnvelope[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const envelope of envelopes) {
    const parsed = parseNotifyWebhookJson(envelope);
    if (parsed.ok === false) {
      return { ok: false, message: parsed.issues.map((i) => i.message).join('; ') };
    }
    if ('noop' in parsed) {
      continue;
    }
    const webhook = parsed.webhook;
    const receivedAt = new Date().toISOString();

    try {
      await safeCheckServiceRunDataUpdate(checkServiceRunId, (runData?: Prisma.JsonValue) => {
        const current = (runData ?? {}) as CheckServiceRunData;
        const sd = textIntegrityDataSchema.safeParse(current.serviceData);
        const currentServiceData = sd.success ? sd.data : MINIMAL_TEXT_INTEGRITY_SERVICE_DATA;

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
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to apply relay status envelope',
      };
    }
  }

  return { ok: true };
}
