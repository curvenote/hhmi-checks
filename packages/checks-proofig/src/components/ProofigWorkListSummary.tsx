import { cn } from '@curvenote/scms-core';
import { Eye, Hourglass } from 'lucide-react';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigWorkListSummaryState } from './proofigWorkListSummaryState.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';
import { getProofigSummaryCounts, proofigIsAwaitingHumanReview } from '../utils/proofigSummary.js';

type ProofigWorkListSummaryProps = {
  metadata: ProofigDataSchema | undefined;
  compact?: boolean;
};

export function ProofigWorkListSummary({ metadata, compact = false }: ProofigWorkListSummaryProps) {
  const { label, underlineClassName } = getProofigWorkListSummaryState(metadata);
  const { total, matchesReview, bad } = getProofigSummaryCounts(metadata);
  const awaitingHumanReview = proofigIsAwaitingHumanReview(metadata);

  if (compact) {
    const isSubimageReview = label.includes('SUB-IMAGE REVIEW');
    const isProblemState = underlineClassName === 'bg-destructive' && bad > 0;
    const isInProgressState =
      !awaitingHumanReview &&
      !isProblemState &&
      !isSubimageReview &&
      underlineClassName !== 'bg-success';
    const compactLabel = awaitingHumanReview && total > 0 ? `${matchesReview}/${total}` : bad;
    return (
      <>
        <span className="inline-flex h-4 flex-col items-center justify-center gap-0.5 leading-none">
          <span className="font-medium text-[10px] text-foreground whitespace-nowrap">
            {isSubimageReview ? (
              <Eye className="size-3.5" aria-label={label} />
            ) : awaitingHumanReview || isProblemState ? (
              compactLabel
            ) : isInProgressState ? (
              <Hourglass className="size-3.5" aria-label={label} />
            ) : (
              label
            )}
          </span>
          <span className={cn('h-0.5 w-full min-w-3 rounded-full', underlineClassName)} />
        </span>
        <span className="inline-flex h-4 items-center text-muted-foreground" aria-hidden>
          |
        </span>
        <span className="flex h-4 items-center min-w-0 max-w-28 [&_img]:max-h-3.5 [&_svg]:max-h-3.5">
          <ProofigSummaryTitle metadata={metadata} />
        </span>
      </>
    );
  }

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
          {label}
        </span>
        <span className={cn('h-0.5 w-full rounded-full', underlineClassName)} />
      </span>
      <span
        className={cn('inline-flex items-center text-muted-foreground', compact ? 'h-4' : 'h-5')}
        aria-hidden
      >
        |
      </span>
      <span
        className={cn(
          'flex items-center min-w-0 max-w-28',
          compact
            ? 'h-4 [&_img]:max-h-3.5 [&_svg]:max-h-3.5'
            : 'h-5 [&_img]:max-h-4 [&_svg]:max-h-4',
        )}
      >
        <ProofigSummaryTitle metadata={metadata} />
      </span>
    </>
  );
}
