import { ui } from '@curvenote/scms-core';
import { StageStartedRelative } from '../StageStartedRelative.js';

export function StageProgressArea({
  step,
  numSteps,
  state,
  message,
  stageStartedAt,
  label,
  addSuffix,
}: {
  step: number;
  numSteps: number;
  state?: 'default' | 'error' | 'success';
  message?: string;
  /** When set, shows a live-updating “Started … ago” line instead of `message`. */
  stageStartedAt?: string;
  label?: string;
  addSuffix?: boolean;
}) {
  const subline =
    stageStartedAt != null && stageStartedAt !== '' ? (
      <StageStartedRelative isoTimestamp={stageStartedAt} label={label} addSuffix={addSuffix} />
    ) : (
      (message ?? null)
    );

  return (
    <div className="space-y-1 w-full">
      <ui.SegmentedProgressBar progress={step} numSteps={numSteps} state={state} />
      {subline != null ? (
        <div>
          <div className="text-xs text-left text-muted-foreground">{subline}</div>
        </div>
      ) : null}
    </div>
  );
}
