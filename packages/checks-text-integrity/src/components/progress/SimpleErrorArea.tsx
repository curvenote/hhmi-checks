import { ui } from '@curvenote/scms-core';
import type { PipelineSegmentTone } from '../SegmentedProgressBar.js';
import { StageProgressArea } from './StageProgressArea.js';

export function SimpleErrorArea({
  numSteps,
  segmentTones,
  failedStageTitle,
  error,
}: {
  numSteps: number;
  segmentTones: PipelineSegmentTone[];
  /** e.g. "Processing" — shown in the alert after "during …". */
  failedStageTitle: string;
  error?: string;
}) {
  const stagePhrase = failedStageTitle.toLowerCase();
  const detail = error?.trim() ? error : 'Unknown error';

  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="error"
        message={
          <div>
            <span className="font-bold">Text integrity check failed</span> during {stagePhrase}.{' '}
            {detail}
          </div>
        }
      />
      <StageProgressArea numSteps={numSteps} segmentTones={segmentTones} message={detail} />
    </div>
  );
}
