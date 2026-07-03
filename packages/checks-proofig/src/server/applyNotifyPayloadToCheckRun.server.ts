import type { ZodIssue } from 'zod';
import { MINIMAL_PROOFIG_SERVICE_DATA, ProofigNotifyPayloadSchema } from '../schema.js';
import { updateStagesAndServiceDataFromValidatedNotifyPayload } from './stateMachine.server.js';
import { patchProofigRunServiceData } from './checkRunColumns.server.js';

export type ApplyNotifyResult =
  | { ok: true }
  | { ok: false; kind: 'parse'; issues: ZodIssue[] }
  | { ok: false; kind: 'persist'; message: string };

/**
 * Applies a Proofig notify-shaped JSON body to a check service run (same persistence as the notify webhook).
 */
export async function applyNotifyPayloadToCheckRun(
  checkServiceRunId: string,
  json: unknown,
  receivedAt: string,
): Promise<ApplyNotifyResult> {
  const parsed = ProofigNotifyPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, kind: 'parse', issues: parsed.error.issues };
  }

  try {
    await patchProofigRunServiceData(
      checkServiceRunId,
      (existingServiceData) => {
        const nextServiceData = updateStagesAndServiceDataFromValidatedNotifyPayload(
          existingServiceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
          parsed.data,
          receivedAt,
        );
        return nextServiceData ?? null;
      },
      receivedAt,
    );
  } catch (err) {
    return {
      ok: false,
      kind: 'persist',
      message: err instanceof Error ? err.message : 'Failed to persist payload',
    };
  }

  return { ok: true };
}
