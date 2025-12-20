import { Check } from 'lucide-react';
import { cn, ui } from '@curvenote/scms-core';

export function ComplianceInfoCards({
  className,
  dashboard,
}: {
  className?: string;
  dashboard?: boolean;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <ui.Card className="p-4 px-6">
        <h4 className="mb-2">The Policy:</h4>
        <p className="text-muted-foreground">HHMI requires a CC BY license on:</p>
        <ul className="mt-2 space-y-1">
          <li className="flex gap-2 items-center">
            <Check className="w-5 h-5 text-[#6CC24A] flex-shrink-0 mt-1" />
            <span className="text-muted-foreground">Journal articles submitted in 2022-2025</span>
          </li>
          <li className="flex gap-2 items-start">
            <Check className="w-5 h-5 text-[#6CC24A] flex-shrink-0 mt-1" />
            <span className="text-muted-foreground">Preprints submitted in 2026 and after</span>
          </li>
          <li className="flex gap-2 items-start">
            <Check className="w-5 h-5 text-[#6CC24A] flex-shrink-0 mt-1" />
            <span className="text-muted-foreground">
              Preprints corresponding to journal articles submitted in 2026 and after
            </span>
          </li>
        </ul>
      </ui.Card>
      {!dashboard && (
        <ui.Card className="p-4 px-6">
          <h4 className="mb-2">
            Your dashboard shows which of your articles are compliant with HHMI policy
          </h4>
          <p className="mb-3 leading-relaxed text-muted-foreground">
            To help you meet these requirements, the HHMI Open Science Team curates and maintains a
            personalized compliance report. The report is visible only to you and other users you
            decide to give access to.
          </p>
        </ui.Card>
      )}
      {dashboard && (
        <ui.Card className="p-4 px-6">
          <h4 className="mb-2">Compliance Dashboard Summary</h4>
          <p className="mb-3 leading-relaxed text-muted-foreground">
            Articles since the later of January 1, 2022 or the HHMI hire date (shown below) are
            included. If there are any errors or omissions, please request help from the Open
            Science Team. The report is visible only to you and other users you decide to give
            access to.
          </p>
        </ui.Card>
      )}
    </div>
  );
}
