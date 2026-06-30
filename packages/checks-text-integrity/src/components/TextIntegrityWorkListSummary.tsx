import { cn } from '@curvenote/scms-core';
import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults, hasError } from '../schema.js';
import { similarityScoreBarColorClass } from './SimilarityPercentageBar.js';
import { TextIntegritySummaryTitle } from './TextIntegritySummaryTitle.js';

type TextIntegrityWorkListSummaryProps = {
  metadata: TextIntegrityDataSchema | undefined;
};

function TextIntegrityWorkListSummaryLogo({ metadata }: TextIntegrityWorkListSummaryProps) {
  return (
    <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
      <TextIntegritySummaryTitle metadata={metadata} />
    </span>
  );
}

export function TextIntegrityWorkListSummary({ metadata }: TextIntegrityWorkListSummaryProps) {
  if (canShowResults(metadata) && metadata?.summaryReport) {
    const overall = metadata.summaryReport.overallMatchPercentage ?? 0;
    return (
      <>
        <span className="inline-flex flex-col gap-0.5 items-center leading-none">
          <span className="font-semibold text-foreground tabular-nums">{overall}%</span>
          <span
            className={cn('h-0.5 w-full rounded-full', similarityScoreBarColorClass(overall))}
          />
        </span>
        <span className="text-muted-foreground" aria-hidden>
          |
        </span>
        <TextIntegrityWorkListSummaryLogo metadata={metadata} />
      </>
    );
  }

  const label = !metadata?.stages ? 'Pending' : hasError(metadata) ? 'Error' : 'In progress';
  const labelClassName = hasError(metadata) ? 'text-destructive' : 'text-foreground';

  return (
    <>
      <span className={cn('font-medium leading-none whitespace-nowrap', labelClassName)}>
        {label}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        |
      </span>
      <TextIntegrityWorkListSummaryLogo metadata={metadata} />
    </>
  );
}
