import type { ProofigDataSchema } from './schema.js';

export interface ProofigSummaryCounts {
  total: number;
  waiting: number;
  bad: number;
  good: number;
}

/**
 * Derive display counts from proofig metadata summary.
 * total = total_subimages, waiting = matches_review,
 * bad = matches_report + inspects_report, good = waiting - bad.
 */
export function getProofigSummaryCounts(
  proofigData: ProofigDataSchema | undefined,
): ProofigSummaryCounts {
  const summary = proofigData?.summary;
  const total = summary?.subimagesTotal ?? 0;
  const waiting = summary?.matchesReview ?? 0;
  const bad = (summary?.matchesReport ?? 0) + (summary?.inspectsReport ?? 0);
  const good = Math.max(0, total - waiting - bad);
  return { total, waiting, bad, good };
}
