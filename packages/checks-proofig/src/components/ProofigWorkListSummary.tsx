import { cn } from '@curvenote/scms-core';
import { Eye, Hourglass } from 'lucide-react';
import type { ProofigDataSchema } from '../schema.js';
import {
  getProofigWorkListCompactSummaryState,
  getProofigWorkListSummaryState,
} from './proofigWorkListSummaryState.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';

type ProofigWorkListSummaryProps = {
  metadata: ProofigDataSchema | undefined;
  compact?: boolean;
};

export function ProofigWorkListSummary({ metadata, compact = false }: ProofigWorkListSummaryProps) {
  const { label, underlineClassName } = getProofigWorkListSummaryState(metadata);

  if (compact) {
    const compactState = getProofigWorkListCompactSummaryState(metadata);
    const compactContent =
      compactState.kind === 'icon' ? (
        compactState.icon === 'eye' ? (
          <Eye className="size-3.5" aria-label={compactState.ariaLabel} />
        ) : (
          <Hourglass className="size-3.5" aria-label={compactState.ariaLabel} />
        )
      ) : (
        compactState.label
      );
    return (
      <>
        <span className="inline-flex h-4 flex-col items-center justify-center gap-0.5 leading-none">
          <span className="font-medium text-[10px] text-foreground whitespace-nowrap">
            {compactContent}
          </span>
          <span
            className={cn('h-0.5 w-full min-w-3 rounded-full', compactState.underlineClassName)}
          />
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
      <span className="inline-flex flex-col gap-0.5 justify-center items-center h-5 leading-none">
        <span className="font-medium text-foreground whitespace-nowrap">{label}</span>
        <span className={cn('h-0.5 w-full rounded-full', underlineClassName)} />
      </span>
      <span className="inline-flex items-center h-5 text-muted-foreground" aria-hidden>
        |
      </span>
      <span className="flex items-center h-5 min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
        <ProofigSummaryTitle metadata={metadata} />
      </span>
    </>
  );
}
