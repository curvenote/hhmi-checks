import { cn } from '@curvenote/scms-core';
import type { ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import { getProofigSummaryCounts } from '../utils/proofigSummary.js';
import { STAGE_LABELS } from './ProofigProgressComponent.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';

type ProofigWorkListSummaryProps = {
  metadata: ProofigDataSchema | undefined;
};

function proofigWorkListSummary(metadata: ProofigDataSchema | undefined): {
  label: string;
  underlineClassName: string;
} {
  const stages = { ...ALL_PENDING_STAGES, ...metadata?.stages };
  const { currentStage, currentStageData } = getCurrentProofigStage(stages);
  const { bad } = getProofigSummaryCounts(metadata);
  const isAtResults = currentStage === 'resultsReview';
  const outcome = metadata?.stages?.resultsReview?.outcome;

  if (isAtResults && outcome !== undefined) {
    if (bad === 0) return { label: 'ALL CLEAR', underlineClassName: 'bg-success' };
    if (bad > 0) {
      return {
        label: `${bad} ${bad === 1 ? 'PROBLEM' : 'PROBLEMS'} FOUND`,
        underlineClassName: 'bg-destructive',
      };
    }
    return { label: 'AWAITING REVIEW', underlineClassName: 'bg-warning' };
  }

  const status = (currentStageData as { status?: string } | undefined)?.status;
  const underlineClassName =
    status === 'error'
      ? 'bg-destructive'
      : status === 'completed' || status === 'notify-skipped'
        ? 'bg-success'
        : status === 'processing'
          ? 'bg-primary'
          : 'bg-warning';

  return {
    label: (STAGE_LABELS[currentStage] ?? 'In progress').toUpperCase(),
    underlineClassName,
  };
}

export function ProofigWorkListSummary({ metadata }: ProofigWorkListSummaryProps) {
  const { label, underlineClassName } = proofigWorkListSummary(metadata);

  return (
    <>
      <span className="inline-flex flex-col gap-0.5 items-center leading-none">
        <span className="font-medium text-foreground whitespace-nowrap">{label}</span>
        <span className={cn('h-0.5 w-full rounded-full', underlineClassName)} />
      </span>
      <span className="text-muted-foreground" aria-hidden>
        |
      </span>
      <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
        <ProofigSummaryTitle metadata={metadata} />
      </span>
    </>
  );
}
