import { KnownState, type ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import { getProofigSummaryCounts, proofigIsAwaitingHumanReview } from '../utils/proofigSummary.js';
import { STAGE_LABELS } from './ProofigProgressComponent.js';

export type ProofigWorkListSummaryState = {
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
  const { total, matchesReview, matchesReport, inspectsReport, bad } =
    getProofigSummaryCounts(metadata);
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
    if (matchesReview === 0 && matchesReport === 0 && inspectsReport === 0) {
      return { label: 'ALL CLEAR', underlineClassName: 'bg-success' };
    }
    if (matchesReview > 0 && matchesReport === 0 && inspectsReport === 0) {
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
