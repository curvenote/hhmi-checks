import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ProofigLogoMono } from '../icons.js';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedSubimageApproval({
  data,
  reportUrl,
}: {
  data: ProofigStage;
  reportUrl?: string;
}) {
  if (data.status === 'failed') {
    return <SimplifiedError data={data} message="Subimage selection failed" />;
  }
  return (
    <div className="space-y-2">
      <ui.SimpleAlert type="warning" message="Awaiting sub-image approval. Please review and confirm in Proofig." />
      {reportUrl && (
        <ui.Button variant="default" asChild>
          <a href={reportUrl} target="_blank" rel="noopener noreferrer">
            <span className="flex gap-2 items-center">
              <span>Open report in</span>
              <ProofigLogoMono className="h-7" />
            </span>
          </a>
        </ui.Button>
      )}
    </div>
  );
}
