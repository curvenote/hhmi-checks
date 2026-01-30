import { Logos } from '../client.js';
import type { ProofigReviewStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ImageStateSummary } from './ImageStateSummary.js';
import { ImageStateLegend } from './ImageStateLegend.js';
import { ImageStateHeadline } from './ImageStateHeadline.js';

export function ResultsFinalizedArea({ data }: { data: ProofigReviewStage }) {
  // TODO: Get actual values from proofig data
  let total = 147;
  let bad = 0;
  let waiting = 0;
  let good = 34;

  if (data.status === 'error') {
    total = 147;
    bad = 4;
    waiting = 0;
    good = 30;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <ImageStateHeadline total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateSummary total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateLegend total={total} bad={bad} waiting={waiting} good={good} />
      </div>

      {bad > 0 && (
        <div className="flex justify-end">
          <ui.Button variant="default">
            <div className="flex gap-1 items-center">
              <div>View final integrity report on</div>
              <Logos.ProofigLogoMono className="h-7" />
            </div>
          </ui.Button>
        </div>
      )}
      {bad === 0 && (
        <div className="flex justify-end text-xl font-extralight text-muted-foreground">
          No action is needed
        </div>
      )}
    </div>
  );
}
