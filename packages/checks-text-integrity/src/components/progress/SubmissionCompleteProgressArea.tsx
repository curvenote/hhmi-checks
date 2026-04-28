import { ui } from '@curvenote/scms-core';
import { StageProgressArea } from './StageProgressArea.js';

export function SubmissionCompleteProgressArea() {
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Submission complete.</span> Waiting for confirmation that
            processing has started.
          </div>
        }
      />
      <StageProgressArea step={2} numSteps={3} message="File received and queued for processing…" />
    </div>
  );
}
