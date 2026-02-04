import { Logos } from '../client.js';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigSummaryCounts } from '../proofigSummary.js';
import { ui } from '@curvenote/scms-core';
import { ImageStateSummary } from './ImageStateSummary.js';
import { ImageStateLegend } from './ImageStateLegend.js';
import { ImageStateHeadline } from './ImageStateHeadline.js';

export function ResultsFinalizedArea({
  proofigData,
}: {
  proofigData: ProofigDataSchema | undefined;
}) {
  const { total, waiting, bad, good } = getProofigSummaryCounts(proofigData);
  const reportUrl = proofigData?.reportUrl;
  const outcome = proofigData?.stages?.resultsReview?.outcome;
  const showViewReportButton = reportUrl && outcome !== 'clean';

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <ImageStateHeadline total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateSummary total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateLegend total={total} bad={bad} waiting={waiting} good={good} />
      </div>

      <div className="flex gap-4 justify-end items-center">
        {bad === 0 && (
          <span className="text-xl font-extralight text-muted-foreground">No action is needed</span>
        )}
        {showViewReportButton && (
          <ui.Button variant="default" asChild>
            <a href={reportUrl} target="_blank" rel="noopener noreferrer">
              <div className="flex gap-1 items-center">
                <div>View final integrity report on</div>
                <Logos.ProofigLogoMono className="h-7" />
              </div>
            </a>
          </ui.Button>
        )}
      </div>
    </div>
  );
}
