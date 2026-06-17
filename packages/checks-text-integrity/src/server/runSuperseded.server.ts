import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import { textIntegrityDataSchema } from '../schema.js';

type RunRow = { data: unknown };

/** True when a failed run was already retried and should leave the admin failed-runs list. */
export function isTextIntegrityRunSupersededByRetry(run: RunRow): boolean {
  if (run.data == null || typeof run.data !== 'object') return false;
  const raw = (run.data as Record<string, unknown>).serviceData;
  const parsed = textIntegrityDataSchema.safeParse(raw);
  return parsed.success && Boolean(parsed.data.supersededByRunId?.trim());
}

export async function markTextIntegritySourceRunSupersededByRetry(
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
    const parsed = textIntegrityDataSchema.safeParse(base);
    const serviceData = parsed.success ? parsed.data : textIntegrityDataSchema.parse({});
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
