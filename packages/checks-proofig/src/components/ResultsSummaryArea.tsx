import { Logos } from '../client.js';
import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ImageStateSummary } from './ImageStateSummary.js';
import { ImageStateLegend } from './ImageStateLegend.js';
import { ImageStateHeadline } from './ImageStateHeadline.js';

export function ResultsReviewProgressArea({ data }: { data: ProofigStage }) {
  // TODO: Get actual values from proofig data
  let total = 147;
  let bad = 0;
  let waiting = 34;
  let good = 0;

  if (data.status === 'failed') {
    total = 147;
    bad = 2;
    waiting = 14;
    good = 18;
  } else if (data.status === 'processing') {
    total = 147;
    bad = 0;
    waiting = 22;
    good = 12;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <ImageStateHeadline total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateSummary total={total} bad={bad} waiting={waiting} good={good} />
        <ImageStateLegend total={total} bad={bad} waiting={waiting} good={good} />
      </div>

      <div className="flex justify-end">
        <ui.Button variant="default">
          <div className="flex gap-2 items-center">
            <div>Review results at</div>
            <Logos.ProofigLogoMono className="h-7" />
          </div>
        </ui.Button>
      </div>
    </div>
  );
}
