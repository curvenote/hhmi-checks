import { data } from 'react-router';
import { getPrismaClient } from '@curvenote/scms-server';
import type { WorkVersionMetadata } from '@curvenote/scms-server';
import type { FileMetadataSection } from '@curvenote/scms-core';
import { type ProofigDataSchema } from '../schema.js';

// Define the checks metadata section type (matches app schema)
export interface ChecksMetadataSection {
  checks?: {
    enabled?: string[];
    proofig?: ProofigDataSchema;
    'curvenote-structure'?: { dispatched: boolean };
    ithenticate?: { dispatched: boolean };
  };
}

type WorkVersionMetadataWithChecks = WorkVersionMetadata &
  FileMetadataSection &
  ChecksMetadataSection;

/**
 * Handle ProofFig-specific actions
 */
export async function handleProofigAction(args: {
  intent: string;
  formData: FormData;
  workVersionId: string;
  metadata: WorkVersionMetadataWithChecks;
}): Promise<Response> {
  const { intent, workVersionId, metadata } = args;

  if (intent !== 'proofig-initial-post') {
    return data(
      { error: { type: 'general', message: 'Unknown intent' } },
      { status: 400 },
    ) as unknown as Response;
  }

  // Early validation: ensure checks and proofig metadata exist
  if (!metadata.checks) {
    return data(
      { error: { type: 'validation', message: 'Checks metadata not found' } },
      { status: 400 },
    ) as unknown as Response;
  }

  const checksMetadata = metadata.checks as ChecksMetadataSection['checks'];
  if (!checksMetadata?.proofig) {
    return data(
      { error: { type: 'validation', message: 'Proofig status not found in metadata' } },
      { status: 400 },
    ) as unknown as Response;
  }

  // Early check: ensure proofig hasn't already been dispatched
  const proofigStatus: ProofigDataSchema = checksMetadata.proofig;

  // TODO: Implement actual Proofig API call here
  // For now, we'll just update the metadata to mark as dispatched and set initial stage
  // Update to mark initial post as processing
  proofigStatus.stages.initialPost = {
    status: 'processing',
    history: [],
    timestamp: new Date().toISOString(),
  };

  // TODO: Call Proofig API here and get reportId
  // proofigStatus.reportId = result.reportId;

  // Update the metadata in the database
  const prisma = await getPrismaClient();
  await prisma.workVersion.update({
    where: { id: workVersionId },
    data: {
      metadata: {
        ...metadata,
        checks: {
          ...checksMetadata,
          proofig: proofigStatus,
        },
      },
    },
  });

  // Return plain object - React Router v7 will automatically convert it to a Response
  return { success: true } as unknown as Response;
}
