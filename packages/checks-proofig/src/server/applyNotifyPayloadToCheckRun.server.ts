import type { Prisma } from '@curvenote/scms-db';
import type { ZodIssue } from 'zod';
import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import {
  MINIMAL_PROOFIG_SERVICE_DATA,
  ProofigNotifyPayloadSchema,
  proofigDataSchema,
  type ProofigDataSchema,
} from '../schema.js';
import { updateStagesAndServiceDataFromValidatedNotifyPayload } from './stateMachine.server.js';

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
    await safeCheckServiceRunDataUpdate(checkServiceRunId, (data?: Prisma.JsonValue) => {
      const current = (data as Record<string, unknown>) ?? {};
      const currentServiceData = current.serviceData as unknown;

      const existingServiceDataResult = proofigDataSchema.safeParse(currentServiceData);
      const existingServiceData: ProofigDataSchema | undefined = existingServiceDataResult.success
        ? existingServiceDataResult.data
        : undefined;

      const nextServiceData = updateStagesAndServiceDataFromValidatedNotifyPayload(
        existingServiceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
        parsed.data,
        receivedAt,
      );

      if (nextServiceData == null) {
        return null;
      }

      return {
        ...current,
        status: (current.status as string) ?? 'healthy',
        serviceDataSchema: (current.serviceDataSchema as Record<string, unknown>) ?? {},
        serviceData: nextServiceData,
      } as Prisma.JsonObject;
    });
  } catch (err) {
    return {
      ok: false,
      kind: 'persist',
      message: err instanceof Error ? err.message : 'Failed to persist payload',
    };
  }

  return { ok: true };
}
