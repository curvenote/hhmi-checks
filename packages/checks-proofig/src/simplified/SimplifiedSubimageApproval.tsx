import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ProofigLogoMono } from '../icons.js';
import { ReportNoLongerAvailable } from '../components/ReportNoLongerAvailable.js';
import { SimplifiedError } from './SimplifiedError.js';

export function SimplifiedSubimageApproval({
  data,
  reportUrl,
  deleted,
}: {
  data: ProofigStage;
  reportUrl?: string;
  deleted?: boolean;
}) {
  if (data.status === 'error') {
    return <SimplifiedError data={data} message="Subimage selection failed" />;
  }
  return (
    <div className="space-y-2">
      <ui.SimpleAlert
        type="warning"
        message="Awaiting sub-image approval. Please review and confirm in Proofig."
      />
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        {deleted ? (
          <ReportNoLongerAvailable />
        ) : reportUrl ? (
          <ui.Button variant="default" asChild>
            <a href={reportUrl} target="_blank" rel="noopener noreferrer">
              <span className="flex gap-2 items-center">
                <span>Open report in</span>
                <ProofigLogoMono className="h-7" />
              </span>
            </a>
          </ui.Button>
        ) : null}
      </div>
    </div>
  );
}
