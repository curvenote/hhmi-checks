import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ProofigProgressRefreshRow } from '../components/ProofigProgressRefreshRow.js';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedInitialPost({
  data,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: {
  data: ProofigStage;
  workVersionId?: string;
  checkRunId?: string;
  remoteStatusActionPath?: string;
}) {
  if (data.status === 'error') {
    return <SimplifiedError data={data} message="Upload failed" />;
  }
  const refresh = (
    <ProofigProgressRefreshRow
      remoteStatusActionPath={remoteStatusActionPath}
      workVersionId={workVersionId}
      checkRunId={checkRunId}
    />
  );
  switch (data.status) {
    case 'pending':
      return (
        <div className="space-y-2">
          <ui.SimpleAlert type="info" message="Connecting…" />
          {refresh}
        </div>
      );
    case 'processing':
      return (
        <div className="space-y-2">
          <ui.SimpleAlert type="info" message="Uploading to Proofig…" />
          {refresh}
        </div>
      );
    case 'completed':
      return (
        <div className="space-y-2">
          <ui.SimpleAlert type="info" message="Upload complete." />
          {refresh}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <ui.SimpleAlert type="info" message="Pending" />
          {refresh}
        </div>
      );
  }
}
