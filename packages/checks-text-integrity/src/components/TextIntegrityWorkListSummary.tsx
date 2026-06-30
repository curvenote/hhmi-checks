import { TextIntegritySummaryBadge } from './TextIntegritySummaryBadge.js';
import { TextIntegritySummaryTitle } from './TextIntegritySummaryTitle.js';

type TextIntegrityWorkListSummaryProps = {
  metadata: any;
};

export function TextIntegrityWorkListSummary({ metadata }: TextIntegrityWorkListSummaryProps) {
  return (
    <>
      <span className="flex items-center min-w-0 max-w-28 [&_img]:max-h-4 [&_svg]:max-h-4">
        <TextIntegritySummaryTitle metadata={metadata} />
      </span>
      <TextIntegritySummaryBadge metadata={metadata} />
    </>
  );
}
