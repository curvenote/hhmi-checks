import { SegmentedProgressBar } from '../SegmentedProgressBar.js';

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
