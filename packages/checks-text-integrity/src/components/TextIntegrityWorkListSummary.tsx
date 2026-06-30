import { cn } from '@curvenote/scms-core';
import { Hourglass } from 'lucide-react';
import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults, hasError } from '../schema.js';
import { similarityScoreBarColorClass } from './SimilarityPercentageBar.js';
import { TextIntegritySummaryTitle } from './TextIntegritySummaryTitle.js';

type TextIntegrityWorkListSummaryProps = {
  metadata: TextIntegrityDataSchema | undefined;
  compact?: boolean;
};

function TextIntegrityWorkListSummaryLogo({
  metadata,
  compact,
}: TextIntegrityWorkListSummaryProps) {
  return (
    <span
      className={cn(
        'flex items-center min-w-0 max-w-28',
        compact ? 'h-4 [&_img]:max-h-2.5 [&_svg]:max-h-2.5' : 'h-5 [&_img]:max-h-4 [&_svg]:max-h-4',
      )}
    >
      <TextIntegritySummaryTitle metadata={metadata} />
    </span>
  );
}

export function TextIntegrityWorkListSummary({
  metadata,
  compact = false,
}: TextIntegrityWorkListSummaryProps) {
  if (canShowResults(metadata) && metadata?.summaryReport) {
    const overall = metadata.summaryReport.overallMatchPercentage ?? 0;
    return (
      <>
        <span
          className={cn(
            'inline-flex flex-col gap-0.5 justify-center items-center leading-none',
            compact ? 'h-4' : 'h-5',
          )}
        >
          <span
            className={cn('font-semibold text-foreground tabular-nums', compact && 'text-[10px]')}
          >
            {overall}%
          </span>
          <span
            className={cn('h-0.5 w-full rounded-full', similarityScoreBarColorClass(overall))}
          />
        </span>
        <span
          className={cn('inline-flex items-center text-muted-foreground', compact ? 'h-4' : 'h-5')}
          aria-hidden
        >
          |
        </span>
        <TextIntegrityWorkListSummaryLogo metadata={metadata} compact={compact} />
      </>
    );
  }

  const label = !metadata?.stages ? 'PENDING' : hasError(metadata) ? 'ERROR' : 'IN PROGRESS';
  const underlineClassName = hasError(metadata) ? 'bg-destructive' : 'bg-warning';

  return (
    <>
      <span
        className={cn(
          'inline-flex flex-col gap-0.5 justify-center items-center leading-none',
          compact ? 'h-4' : 'h-5',
        )}
      >
        <span
          className={cn('font-medium text-foreground whitespace-nowrap', compact && 'text-[10px]')}
        >
          {compact && !hasError(metadata) ? (
            <Hourglass className="size-3.5" aria-label={label} />
          ) : (
            label
          )}
        </span>
        <span className={cn('h-0.5 w-full rounded-full', underlineClassName)} />
      </span>
      <span
        className={cn('inline-flex items-center text-muted-foreground', compact ? 'h-4' : 'h-5')}
        aria-hidden
      >
        |
      </span>
      <TextIntegrityWorkListSummaryLogo metadata={metadata} compact={compact} />
    </>
  );
}
