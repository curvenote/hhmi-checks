import { ProofigSummaryBadge } from './ProofigSummaryBadge.js';
import { ProofigSummaryTitle } from './ProofigSummaryTitle.js';

type ProofigWorkListSummaryProps = {
  metadata: any;
};

export function ProofigWorkListSummary({ metadata }: ProofigWorkListSummaryProps) {
  return (
    <>
      <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
        <ProofigSummaryTitle metadata={metadata} />
      </span>
      <ProofigSummaryBadge metadata={metadata} />
    </>
  );
}
