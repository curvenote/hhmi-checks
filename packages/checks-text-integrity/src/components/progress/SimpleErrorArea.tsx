import { ui } from '@curvenote/scms-core';
import { StageProgressArea } from './StageProgressArea.js';

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
