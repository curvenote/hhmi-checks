import {
  workVersionUploadsStage,
  workVersionUploadsComplete,
  workVersionUploadRemove,
} from '@curvenote/scms-server';
import { FILE_UPLOAD_CONFIGURATION } from '../common/fileUploadConfiguration.js';
import type { WorkContext } from '@curvenote/scms-server';
import { data as dataResponse } from 'react-router';

export async function validateAndHandleUploads(
  ctx: WorkContext,
  formData: FormData,
  intent: string,
  workVersionId: string,
  cdn: string,
) {
  const slot = formData.get('slot') as string;
  if (!slot) {
    return dataResponse(
      { error: { type: 'general', message: 'Slot not provided' } },
      { status: 400 },
    );
  }

  const uploadConfig = FILE_UPLOAD_CONFIGURATION[slot];
  if (!uploadConfig) {
    return dataResponse(
      {
        error: {
          type: 'general',
          message: `Invalid slot ${slot ?? ''} provided`,
          details: {
            slot,
            configuredSlots: Object.keys(FILE_UPLOAD_CONFIGURATION),
          },
        },
      },
      { status: 400 },
    );
  }
  switch (intent) {
    case 'stage':
      return workVersionUploadsStage(ctx, uploadConfig, formData, workVersionId);
    case 'complete':
      return workVersionUploadsComplete(ctx, formData, workVersionId, cdn);
    case 'remove':
      return workVersionUploadRemove(ctx, formData, workVersionId, cdn);
    default:
      return dataResponse(
        { error: { type: 'general', message: `Invalid intent ${intent}` } },
        { status: 400 },
      );
  }
}
