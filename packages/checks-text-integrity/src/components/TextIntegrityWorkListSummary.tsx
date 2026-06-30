import { cn } from '@curvenote/scms-core';
import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults } from '../schema.js';
import { similarityScoreTextClassName } from './SimilarityPercentageBar.js';
import { TextIntegritySummaryBadge } from './TextIntegritySummaryBadge.js';
import { TextIntegritySummaryTitle } from './TextIntegritySummaryTitle.js';

type TextIntegrityWorkListSummaryProps = {
  metadata: TextIntegrityDataSchema | undefined;
};

export function TextIntegrityWorkListSummary({ metadata }: TextIntegrityWorkListSummaryProps) {
  if (canShowResults(metadata) && metadata?.summaryReport) {
    const overall = metadata.summaryReport.overallMatchPercentage ?? 0;
    return (
      <>
        <span
          className={cn(
            'font-semibold tabular-nums leading-none',
            similarityScoreTextClassName(overall),
          )}
        >
          {overall}%
        </span>
        <span className="text-muted-foreground" aria-hidden>
          |
        </span>
        <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
          <TextIntegritySummaryTitle metadata={metadata} />
        </span>
      </>
    );
  }

  return (
    <>
      <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
        <TextIntegritySummaryTitle metadata={metadata} />
      </span>
      <TextIntegritySummaryBadge metadata={metadata} />
    </>
  );
}
