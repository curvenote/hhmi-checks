import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedInitialPost({ data }: { data: ProofigStage }) {
  if (data.status === 'error') {
    return <SimplifiedError data={data} message="Upload failed" />;
  }
  switch (data.status) {
    case 'pending':
      return (
        <ui.SimpleAlert type="info" message="Connecting…" />
      );
    case 'processing':
      return (
        <ui.SimpleAlert type="info" message="Uploading to Proofig…" />
      );
    case 'completed':
      return (
        <ui.SimpleAlert type="info" message="Upload complete." />
      );
    default:
      return (
        <ui.SimpleAlert type="info" message="Pending" />
      );
  }
}
