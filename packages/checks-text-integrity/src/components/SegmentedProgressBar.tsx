import { cn } from '@curvenote/scms-core';

type ProgressState = 'default' | 'error' | 'success';

interface SegmentedProgressBarProps {
  progress: number;
  numSteps: number;
  state?: ProgressState;
  className?: string;
}

const stateColors: Record<ProgressState, { filled: string; empty: string }> = {
  default: {
    filled: 'bg-primary',
    empty: 'bg-gray-200 dark:bg-gray-700',
  },
  error: {
    filled: 'bg-red-500',
    empty: 'bg-gray-200 dark:bg-gray-700',
  },
  success: {
    filled: 'bg-green-500',
    empty: 'bg-gray-200 dark:bg-gray-700',
  },
};

export function SegmentedProgressBar({
  progress,
  numSteps,
  state = 'default',
  className,
}: SegmentedProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(progress, numSteps));
  const colors = stateColors[state];
  const completedColor = 'bg-green-500';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className={cn('flex gap-[3px]', className)}>
        {Array.from({ length: numSteps }, (_, index) => {
          const isCompleted = index < clampedProgress - 1;
          const isActive = index === clampedProgress - 1;
          const segmentColor = isCompleted
            ? completedColor
            : isActive
              ? colors.filled
              : colors.empty;
          return (
            <div
              key={index}
              className={cn(
                'overflow-hidden relative flex-1 h-2 transition-colors duration-1000',
                segmentColor,
              )}
              aria-label={`Step ${index + 1} of ${numSteps}${isCompleted ? ' - completed' : isActive ? ' - active' : ''}`}
            >
              {isActive && state === 'default' && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent via-white/50"
                  style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
