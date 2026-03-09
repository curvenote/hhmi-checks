import type { Context, ExtensionAdminActionHandler } from '@curvenote/scms-core';
import { getPrismaClient, safeObjectDataUpdate } from '@curvenote/scms-server';
import { coerceToObject } from '@curvenote/scms-core';
import { formatDate } from '@curvenote/common';
import type { Prisma } from '@curvenote/scms-db';
import { uuidv7 as uuid } from 'uuidv7';
import type { ProofigConfigOverlay } from '../server/config.server.js';
import { PROOFIG_CONFIG_OBJECT_TYPE } from '../server/config.server.js';

type ProofigConfigData = ProofigConfigOverlay;

async function getOrCreateProofigConfigObjectId(): Promise<string> {
  const prisma = await getPrismaClient();
  const existing = await prisma.object.findFirst({
    where: { type: PROOFIG_CONFIG_OBJECT_TYPE },
    select: { id: true },
  });
  if (existing) return existing.id;

  const id = uuid();
  const now = formatDate();
  await prisma.object.create({
    data: {
      id,
      type: PROOFIG_CONFIG_OBJECT_TYPE,
      date_created: now,
      date_modified: now,
      data: {},
      occ: 0,
    },
  });
  return id;
}

async function updateProofigConfigField(
  field: keyof ProofigConfigData,
  value: string,
): Promise<{ success: true } | { error: { type: string; message: string } }> {
  try {
    const objectId = await getOrCreateProofigConfigObjectId();
    await safeObjectDataUpdate<ProofigConfigData & Prisma.JsonObject>(objectId, (current) => {
      const base = coerceToObject(current) as ProofigConfigData;
      return { ...base, [field]: value } as ProofigConfigData & Prisma.JsonObject;
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save';
    return { error: { type: 'general', message } };
  }
}

export function getExtensionAdminActionHandlers(): ExtensionAdminActionHandler[] {
  return [
    {
      name: 'proofig-set-baseurl',
      handler: async (_ctx: Context, formData: FormData) => {
        const value = (formData.get('value') ?? '').toString().trim();
        return updateProofigConfigField('apiBaseUrl', value);
      },
    },
    {
      name: 'proofig-set-client-id',
      handler: async (_ctx: Context, formData: FormData) => {
        const value = (formData.get('value') ?? '').toString().trim();
        return updateProofigConfigField('clientId', value);
      },
    },
    {
      name: 'proofig-set-client-secret',
      handler: async (_ctx: Context, formData: FormData) => {
        const value = (formData.get('value') ?? '').toString();
        return updateProofigConfigField('clientSecret', value);
      },
    },
  ];
}
