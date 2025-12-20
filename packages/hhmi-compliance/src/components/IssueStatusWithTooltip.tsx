import { Info } from 'lucide-react';
import { ui } from '@curvenote/scms-core';

/**
 * Component to render issue status with optional tooltip for "HHMI monitoring" status value
 */
export function IssueStatusWithTooltip({
  issueStatus,
}: {
  issueStatus: string | null | undefined;
  issueType?: string | null | undefined; // Optional, kept for potential future use
}) {
  const status = issueStatus ?? '—';
  const isHHMIMonitoring = issueStatus === 'HHMI monitoring';

  if (!isHHMIMonitoring) {
    return <div className="w-full text-center text-muted-foreground">{status}</div>;
  }

  const tooltipText =
    'HHMI is monitoring this publication. This typically means the paper was recently published and the license or PubMed Central submission status cannot yet be confirmed. We will update this status when possible and reach out if you need to take any further action.';

  return (
    <div className="w-full text-center text-muted-foreground">
      <ui.SimpleTooltip title={tooltipText} asChild={false} className="max-w-[300px] text-sm">
        <div className="flex gap-0.5 justify-center items-center cursor-help">
          <span>{status}</span>
          <Info className="inline-block w-3 h-3 text-muted-foreground" />
        </div>
      </ui.SimpleTooltip>
    </div>
  );
}
