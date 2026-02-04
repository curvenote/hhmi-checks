import { Logos } from '../client.js';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigSummaryCounts } from '../proofigSummary.js';
import { ui } from '@curvenote/scms-core';
import { ImageStateSummary } from './ImageStateSummary.js';
import { ImageStateLegend } from './ImageStateLegend.js';
import { ImageStateHeadline } from './ImageStateHeadline.js';

export function ResultsReviewProgressArea({
  proofigData,
}: {
  proofigData: ProofigDataSchema | undefined;
}) {
  const { total, waiting, bad, good } = getProofigSummaryCounts(proofigData);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <ImageStateHeadline total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateSummary total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateLegend total={total} bad={bad} waiting={waiting} good={good} />
      </div>

      <div className="flex justify-end">
        {proofigData?.reportUrl ? (
          <ui.Button variant="default" asChild>
            <a href={proofigData.reportUrl} target="_blank" rel="noopener noreferrer">
              <div className="flex gap-2 items-center">
                <div>Review results at</div>
                <Logos.ProofigLogoMono className="h-7" />
              </div>
            </a>
          </ui.Button>
        ) : (
          <ui.Button variant="default" disabled>
            <div className="flex gap-2 items-center">
              <div>Review results at</div>
              <Logos.ProofigLogoMono className="h-7" />
            </div>
          </ui.Button>
        )}
      </div>
    </div>
  );
}
