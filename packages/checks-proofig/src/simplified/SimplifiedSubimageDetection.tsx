import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedSubimageDetection({ data }: { data: ProofigStage }) {
  if (data.status === 'error') {
    return <SimplifiedError data={data} message="Subimage detection failed" />;
  }
  if (data.status === 'pending') {
    return (
      <ui.SimpleAlert type="info" message="Subimage detection pending…" />
    );
  }
  return (
    <ui.SimpleAlert type="info" message="Identifying sub-images…" />
  );
}
