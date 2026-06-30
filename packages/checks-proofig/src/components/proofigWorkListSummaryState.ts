import { KnownState, type ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import { getProofigSummaryCounts, proofigIsAwaitingHumanReview } from '../utils/proofigSummary.js';
import { STAGE_LABELS } from './ProofigProgressComponent.js';

export type ProofigWorkListSummaryState = {
  label: string;
  underlineClassName: string;
};

export type ProofigWorkListCompactSummaryState =
  | {
      kind: 'icon';
      icon: 'eye' | 'hourglass';
      ariaLabel: string;
      underlineClassName: string;
    }
  | {
      kind: 'text';
      label: string;
      underlineClassName: string;
    };

function problemLabel(count: number) {
  return `${count} ${count === 1 ? 'PROBLEM' : 'PROBLEMS'}`;
}

export function getProofigWorkListSummaryState(
  metadata: ProofigDataSchema | undefined,
): ProofigWorkListSummaryState {
  const stages = { ...ALL_PENDING_STAGES, ...metadata?.stages };
  const { currentStage, currentStageData } = getCurrentProofigStage(stages);
  const { total, matchesReview, bad } = getProofigSummaryCounts(metadata);
  const awaitingHumanReview = proofigIsAwaitingHumanReview(metadata);
  const reportOutcome = metadata?.stages?.resultsReview?.outcome;
  const summaryState = metadata?.summary?.state;
  const hasFinalReport =
    reportOutcome === 'clean' ||
    reportOutcome === 'flagged' ||
    summaryState === KnownState.ReportClean ||
    summaryState === KnownState.ReportFlagged;

  if (awaitingHumanReview) {
    return {
      label: total > 0 ? `${matchesReview}/${total} AWAITING REVIEW` : 'AWAITING REVIEW',
      underlineClassName: 'bg-warning',
    };
  }

  if (hasFinalReport) {
    // Proofig can keep a final `flagged` outcome after reviewers resolve/remove all problem
    // images; it updates the counts but does not send a later clean notification.
    if (bad === 0) {
      return { label: 'ALL CLEAR', underlineClassName: 'bg-success' };
    }
    return { label: problemLabel(bad), underlineClassName: 'bg-destructive' };
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

export function getProofigWorkListCompactSummaryState(
  metadata: ProofigDataSchema | undefined,
): ProofigWorkListCompactSummaryState {
  const summaryState = getProofigWorkListSummaryState(metadata);
  const stages = { ...ALL_PENDING_STAGES, ...metadata?.stages };
  const { currentStage } = getCurrentProofigStage(stages);
  const { total, matchesReview, bad } = getProofigSummaryCounts(metadata);
  const awaitingHumanReview = proofigIsAwaitingHumanReview(metadata);
  const isProblemState = summaryState.underlineClassName === 'bg-destructive' && bad > 0;
  const isInProgressState =
    !awaitingHumanReview &&
    !isProblemState &&
    currentStage !== 'subimageSelection' &&
    summaryState.underlineClassName !== 'bg-success';

  if (awaitingHumanReview) {
    if (total > 0) {
      return {
        kind: 'text',
        label: `${matchesReview}/${total}`,
        underlineClassName: summaryState.underlineClassName,
      };
    }
    return {
      kind: 'icon',
      icon: 'hourglass',
      ariaLabel: summaryState.label,
      underlineClassName: summaryState.underlineClassName,
    };
  }

  if (currentStage === 'subimageSelection') {
    return {
      kind: 'icon',
      icon: 'eye',
      ariaLabel: summaryState.label,
      underlineClassName: summaryState.underlineClassName,
    };
  }

  if (isProblemState) {
    return {
      kind: 'text',
      label: String(bad),
      underlineClassName: summaryState.underlineClassName,
    };
  }

  if (isInProgressState) {
    return {
      kind: 'icon',
      icon: 'hourglass',
      ariaLabel: summaryState.label,
      underlineClassName: summaryState.underlineClassName,
    };
  }

  return {
    kind: 'text',
    label: summaryState.label,
    underlineClassName: summaryState.underlineClassName,
  };
}
