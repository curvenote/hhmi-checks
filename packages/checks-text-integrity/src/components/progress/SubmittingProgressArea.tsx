import { ui } from '@curvenote/scms-core';
import { StageProgressArea } from './StageProgressArea.js';

const DEFAULT_SERVICE_NAME = 'Text Integrity';

export type SubmittingProgressAreaProps = {
  /** When set, shown instead of “Text Integrity” in the upload headline (e.g. branded provider name). */
  name?: string;
};

export function SubmittingProgressArea({ name }: SubmittingProgressAreaProps) {
  const serviceName = name?.trim() || DEFAULT_SERVICE_NAME;

  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Uploading to {serviceName}…</span> submitting your work for
            processing. Large files may take longer to submit.
          </div>
        }
      />
      <StageProgressArea step={1} numSteps={3} message="Usually takes less than 30 seconds…" />
    </div>
  );
}
