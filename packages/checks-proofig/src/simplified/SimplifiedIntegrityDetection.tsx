import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedIntegrityDetection({ data }: { data: ProofigStage }) {
  if (data.status === 'failed') {
    return <SimplifiedError data={data} message="Integrity detection failed" />;
  }
  return (
    <ui.SimpleAlert type="info" message="Running integrity checks…" />
  );
}
