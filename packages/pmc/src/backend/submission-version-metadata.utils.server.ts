import {
  makeDefaultSubmissionVersionMetadata,
  type SubmissionVersionMetadata,
} from '@curvenote/scms-server';
import { data as dataResponse } from 'react-router';
import { safeSubmissionVersionJsonUpdate } from '@curvenote/scms-server';
import { coerceToObject } from '@curvenote/scms-core';
import type { PMCSubmissionVersionMetadata } from '../common/metadata.schema.js';

/**
 * Safely patch PMC SubmissionVersion metadata with OCC
 */
export async function safelyPatchPMCSubmissionVersionMetadata(
  submissionVersionId: string,
  metadataPatch: Record<string, any>,
) {
  try {
    await safeSubmissionVersionJsonUpdate<SubmissionVersionMetadata>(
      submissionVersionId,
      (metadata) => {
        const readMetadata = coerceToObject(metadata);

        const updatedMetadata: SubmissionVersionMetadata = {
          ...makeDefaultSubmissionVersionMetadata(),
          ...readMetadata,
        };

        Object.keys(metadataPatch).forEach((key) => {
          let value = metadataPatch[key];
          if (
            !Array.isArray(metadataPatch[key]) &&
            typeof metadataPatch[key] === 'object' &&
            metadataPatch[key] !== null
          ) {
            value = {
              ...updatedMetadata['pmc']?.[key],
              ...metadataPatch[key],
            };
          }
          updatedMetadata['pmc'] = { ...updatedMetadata['pmc'], [key]: value };
        });

        return updatedMetadata as any;
      },
    );
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return dataResponse(
      {
        error: {
          type: 'general',
          error: 'Failed to update SubmissionVersion metadata',
          details: { submissionVersionId, error },
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Safely update PMC SubmissionVersion metadata with OCC
 *
 * TODO: we should not be dealing with response objects at this level, to be returning/throwing plain objects.
 */
export async function safelyUpdatePMCSubmissionVersionMetadata(
  submissionVersionId: string,
  updateFn: (metadata: PMCSubmissionVersionMetadata) => PMCSubmissionVersionMetadata,
) {
  try {
    await safeSubmissionVersionJsonUpdate<SubmissionVersionMetadata>(
      submissionVersionId,
      (metadata) => {
        const readMetadata = coerceToObject(metadata);

        const updatedPMCSubmissionVersionMetadata = updateFn(readMetadata['pmc'] ?? {});

        const updatedMetadata: SubmissionVersionMetadata = {
          ...makeDefaultSubmissionVersionMetadata(),
          ...readMetadata,
          pmc: updatedPMCSubmissionVersionMetadata,
        };

        return updatedMetadata;
      },
    );

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return dataResponse(
      {
        error: {
          type: 'general',
          error: 'Failed to update SubmissionVersion metadata',
          details: { submissionVersionId, error },
        },
      },
      { status: 500 },
    );
  }
}
