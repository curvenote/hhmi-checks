import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults, hasError } from '../schema.js';
import { ui } from '@curvenote/scms-core';

interface TextIntegritySummaryBadgeProps {
  metadata: TextIntegrityDataSchema | undefined;
}

/**
 * Summary badge for timeline: stage label or result summary (X% similar).
 * Used when the platform renders a check service run item (e.g. work details timeline).
 */
export function TextIntegritySummaryBadge({ metadata }: TextIntegritySummaryBadgeProps) {
  if (!metadata?.stages) {
    return (
      <ui.Badge variant="secondary" size="xs" className="uppercase tracking-wide min-w-[80px]">
        —
      </ui.Badge>
    );
  }

  if (canShowResults(metadata) && metadata.summaryReport) {
    const overall = metadata.summaryReport.overallMatchPercentage ?? 0;
    const variant =
      overall > 20
        ? ('destructive' as const)
        : overall > 0
          ? ('warning' as const)
          : ('success' as const);
    return (
      <ui.Badge variant={variant} size="xs" className="uppercase tracking-wide min-w-[80px]">
        {overall}% similar
      </ui.Badge>
    );
  }

  if (hasError(metadata)) {
    return (
      <ui.Badge variant="destructive" size="xs" className="uppercase tracking-wide min-w-[80px]">
        Error
      </ui.Badge>
    );
  }

  return (
    <ui.Badge variant="warning" size="xs" className="uppercase tracking-wide min-w-[80px]">
      In progress
    </ui.Badge>
  );
}
