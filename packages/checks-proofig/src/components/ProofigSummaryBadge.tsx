import type { ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import { getProofigSummaryCounts } from '../utils/proofigSummary.js';
import { ui } from '@curvenote/scms-core';
import { STAGE_LABELS } from './ProofigProgressComponent.js';

interface ProofigSummaryBadgeProps {
  metadata: ProofigDataSchema | undefined;
}

/**
 * Summary badge for timeline: "All clear", "X problems", "Awaiting review", or current stage.
 * Used when the platform renders a check service run item (e.g. work details timeline).
 */
export function ProofigSummaryBadge({ metadata }: ProofigSummaryBadgeProps) {
  const stages = { ...ALL_PENDING_STAGES, ...metadata?.stages };
  const { currentStage, currentStageData } = getCurrentProofigStage(stages);
  const { bad, waiting } = getProofigSummaryCounts(metadata);
  const isAtResults = currentStage === 'resultsReview';
  const outcome = metadata?.stages?.resultsReview?.outcome;

  // In progress: show current stage label with color by status (pending, processing, completed, failed)
  if (!isAtResults || outcome === undefined) {
    const label = STAGE_LABELS[currentStage] ?? 'In progress';
    const status = (currentStageData as { status?: string } | undefined)?.status;
    const variant =
      status === 'failed' || status === 'error'
        ? ('destructive' as const)
        : status === 'completed'
          ? ('success' as const)
          : status === 'processing'
            ? ('primary' as const)
            : ('warning' as const); // pending or unknown
    return (
      <ui.Badge variant={variant} size="xs" className="uppercase tracking-wide min-w-[80px]">
        {label}
      </ui.Badge>
    );
  }

  // Results: all clear
  if (bad === 0 && waiting === 0) {
    return (
      <ui.Badge variant="success" size="xs" className="uppercase tracking-wide min-w-[80px]">
        All clear
      </ui.Badge>
    );
  }

  // Results: confirmed problems only
  if (bad > 0 && waiting === 0) {
    return (
      <ui.Badge variant="destructive" size="xs" className="uppercase tracking-wide min-w-[80px]">
        {bad} {bad === 1 ? 'problem' : 'problems'} found
      </ui.Badge>
    );
  }

  // Results: awaiting review (or mix)
  return (
    <ui.Badge variant="warning" size="xs" className="uppercase tracking-wide min-w-[80px]">
      Awaiting review
    </ui.Badge>
  );
}
