import { cn } from '@curvenote/scms-core';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigWorkListSummaryState } from './proofigWorkListSummaryState.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';

type ProofigWorkListSummaryProps = {
  metadata: ProofigDataSchema | undefined;
  compact?: boolean;
};

export function ProofigWorkListSummary({ metadata, compact = false }: ProofigWorkListSummaryProps) {
  const { label, underlineClassName } = getProofigWorkListSummaryState(metadata);

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
