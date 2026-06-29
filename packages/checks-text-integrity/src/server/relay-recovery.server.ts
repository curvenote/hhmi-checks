import type { RelayRecoveryHint } from '@curvenote/check-relay-types';
import { MINIMAL_TEXT_INTEGRITY_SERVICE_DATA, textIntegrityDataSchema } from '../schema.js';
import type { TextIntegrityDataSchema } from '../schema.js';

export type CheckServiceRunData = {
  status: string;
  serviceData?: TextIntegrityDataSchema;
  serviceDataSchema?: Record<string, unknown>;
};

type RelayRecoveryLeaseOptions = {
  leaseOwner: string;
  requestedAt: Date;
  leaseExpiresAt: string;
  now: Date;
  userId?: string;
};

function parseServiceData(data: unknown): TextIntegrityDataSchema {
  const current = (data ?? {}) as CheckServiceRunData;
  const parsed = textIntegrityDataSchema.safeParse(current.serviceData);
  return parsed.success
    ? parsed.data
    : (current.serviceData ?? MINIMAL_TEXT_INTEGRITY_SERVICE_DATA);
}

function serviceDataAllowsRelayRecovery(serviceData: TextIntegrityDataSchema | undefined): boolean {
  const processingStatus = serviceData?.stages?.processing?.status;
  return (
    processingStatus !== 'processing' &&
    processingStatus !== 'completed' &&
    processingStatus !== 'notify-skipped'
  );
}

export function applyRelayRecoveryLeaseData(
  data: unknown,
  recovery: RelayRecoveryHint,
  options: RelayRecoveryLeaseOptions,
): CheckServiceRunData | null {
  const current = (data ?? {}) as CheckServiceRunData;
  const serviceData = parseServiceData(current);

  if (!serviceDataAllowsRelayRecovery(serviceData)) return null;

  const existing = serviceData.relayRecovery;
  const sameRecovery = existing?.phase === recovery.phase && existing.action === recovery.action;
  const existingLeaseExpires = existing?.leaseExpiresAt
    ? Date.parse(existing.leaseExpiresAt)
    : Number.NaN;
  const existingLeaseActive =
    sameRecovery &&
    !Number.isNaN(existingLeaseExpires) &&
    existingLeaseExpires > options.now.getTime();

  if (sameRecovery && (existing.startedAt || existingLeaseActive)) return null;

  return {
    ...current,
    serviceData: {
      ...serviceData,
      relayRecovery: {
        phase: recovery.phase,
        action: recovery.action,
        reason: recovery.reason,
        requestedAt: options.requestedAt.toISOString(),
        leaseOwner: options.leaseOwner,
        leaseExpiresAt: options.leaseExpiresAt,
        ...(options.userId ? { requestedByUserId: options.userId } : {}),
      },
    },
  };
}

export function markRelayRecoveryStartedData(
  data: unknown,
  leaseOwner: string,
  startedAt: Date,
): CheckServiceRunData | null {
  const current = (data ?? {}) as CheckServiceRunData;
  const serviceData = parseServiceData(current);
  if (serviceData.relayRecovery?.leaseOwner !== leaseOwner) return null;

  return {
    ...current,
    serviceData: {
      ...serviceData,
      relayRecovery: {
        ...serviceData.relayRecovery,
        startedAt: startedAt.toISOString(),
      },
    },
  };
}
