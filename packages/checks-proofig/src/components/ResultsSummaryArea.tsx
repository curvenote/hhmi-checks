import { Logos } from '../client.js';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigSummaryCounts } from '../utils/proofigSummary.js';
import { ui } from '@curvenote/scms-core';
import { ImageStateSummary } from './ImageStateSummary.js';
import { ImageStateLegend } from './ImageStateLegend.js';
import { ImageStateHeadline } from './ImageStateHeadline.js';
import { MissingReportUrlIcon } from './MissingReportUrlIcon.js';

export function ResultsSummaryArea({
  proofigData,
}: {
  proofigData: ProofigDataSchema | undefined;
}) {
  const { total, waiting, bad, good } = getProofigSummaryCounts(proofigData);
  const reportUrl = proofigData?.reportUrl;
  const showViewReportButton = !!reportUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <ImageStateHeadline total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateSummary total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateLegend total={total} bad={bad} waiting={waiting} good={good} />
      </div>

      <div className="flex gap-2 justify-end items-center">
        {showViewReportButton && (
          <>
            {!proofigData?.reportUrl && <MissingReportUrlIcon />}
            <ui.Button variant="default" asChild disabled={!proofigData?.reportUrl}>
              <a href={proofigData?.reportUrl} target="_blank" rel="noopener noreferrer">
                <div className="flex gap-2 items-center">
                  <div>{waiting > 0 ? 'Review results at' : 'View final report at'}</div>
                  <Logos.ProofigLogoMono className="h-7" />
                </div>
              </a>
            </ui.Button>
          </>
        )}
      </div>
    </div>
  );
}
