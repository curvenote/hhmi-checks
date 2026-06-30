import { cn } from '@curvenote/scms-core';
import type { ProofigDataSchema } from '../schema.js';
import { getProofigWorkListSummaryState } from './proofigWorkListSummaryState.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';

type ProofigWorkListSummaryProps = {
  metadata: ProofigDataSchema | undefined;
};

export function ProofigWorkListSummary({ metadata }: ProofigWorkListSummaryProps) {
  const { label, underlineClassName } = getProofigWorkListSummaryState(metadata);

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
