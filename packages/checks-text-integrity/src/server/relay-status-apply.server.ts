import type { RelayNotifyEnvelope } from '@curvenote/check-relay-types';
import { parseNotifyWebhookJson } from '../schema.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { applyWebhookEvent } from './stateMachine.server.js';
import { patchTextIntegrityRunServiceData } from './checkRunColumns.server.js';

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
      await patchTextIntegrityRunServiceData(
        checkServiceRunId,
        (currentServiceData: TextIntegrityDataSchema) => {
          const nextServiceData = applyWebhookEvent(currentServiceData, webhook, receivedAt);
          return nextServiceData ?? currentServiceData;
        },
        receivedAt,
      );
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to apply relay status envelope',
      };
    }
  }

  return { ok: true };
}
