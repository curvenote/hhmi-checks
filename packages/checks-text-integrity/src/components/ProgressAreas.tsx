import { SegmentedProgressBar } from './SegmentedProgressBar.js';
import { ui } from '@curvenote/scms-core';

export function SimpleErrorArea({
  step,
  numSteps,
  message,
  error,
}: {
  step: number;
  numSteps: number;
  message: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="error"
        message={
          <div>
            <span className="font-bold">{message}</span> {error ?? 'Unknown error'}
          </div>
        }
      />
      <StageProgressArea
        step={step}
        numSteps={numSteps}
        message={error ?? message ?? 'Failed at this stage.'}
        state="error"
      />
    </div>
  );
}

export function SubmittingProgressArea() {
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Uploading to Text Integrity…</span> submitting your work for
            processing. Large files may take longer to submit.
          </div>
        }
      />
      <StageProgressArea step={1} numSteps={1} message="Usually takes less than 30 seconds…" />
    </div>
  );
}

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

export function ProcessingProgressArea() {
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Processing your submission.</span> The text comparison
            service is analysing your work. This may take a few minutes; you can leave this page and
            come back later.
          </div>
        }
      />
      <StageProgressArea step={2} numSteps={3} message="This may take several minutes…" />
    </div>
  );
}

export function StageProgressArea({
  step,
  numSteps,
  state,
  message,
}: {
  step: number;
  numSteps: number;
  state?: 'default' | 'error' | 'success';
  message: string;
}) {
  return (
    <div className="space-y-1 w-full">
      <SegmentedProgressBar progress={step} numSteps={numSteps} state={state} />
      <div>
        <div className="text-xs text-left text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}
