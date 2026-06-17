import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import { proofigDataSchema } from '../schema.js';

type RunRow = { data: unknown };

/** True when a failed run was already retried and should leave the admin failed-runs list. */
export function isProofigRunSupersededByRetry(run: RunRow): boolean {
  if (run.data == null || typeof run.data !== 'object') return false;
  const raw = (run.data as Record<string, unknown>).serviceData;
  const parsed = proofigDataSchema.safeParse(raw);
  return parsed.success && Boolean(parsed.data.supersededByRunId?.trim());
}

export async function markProofigSourceRunSupersededByRetry(
  sourceRunId: string,
  supersededByRunId: string,
  supersededByUserId: string | undefined,
): Promise<void> {
  const supersededAt = new Date().toISOString();
  await safeCheckServiceRunDataUpdate(sourceRunId, (runData?: Prisma.JsonValue) => {
    const current = (runData ?? {}) as Record<string, unknown>;
    const rawServiceData = current.serviceData;
    const base =
      rawServiceData != null && typeof rawServiceData === 'object'
        ? (rawServiceData as Record<string, unknown>)
        : {};
    const parsed = proofigDataSchema.safeParse(base);
    const serviceData = parsed.success ? parsed.data : proofigDataSchema.parse({});
    return {
      ...current,
      serviceData: {
        ...serviceData,
        supersededByRunId,
        supersededAt,
        ...(supersededByUserId ? { supersededByUserId } : {}),
      },
    } as Prisma.JsonObject;
  });
}
