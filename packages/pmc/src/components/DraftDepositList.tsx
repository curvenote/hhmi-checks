import { DraftDepositItem } from './DraftDepositItem.js';
import type { DraftPMCDeposit } from '../backend/db.server.js';

interface DraftDepositListProps {
  deposits: DraftPMCDeposit[];
  onDeleted: () => void;
  onResume: (workId: string, submissionVersionId: string) => void;
}

export function DraftDepositList({ deposits, onDeleted, onResume }: DraftDepositListProps) {
  if (deposits.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No draft deposits found.</div>;
  }

  // Sort deposits by dateModified in descending order (most recent first)
  const sortedDeposits = [...deposits].sort(
    (a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime(),
  );

  return (
    <div className="space-y-3">
      {sortedDeposits.map((deposit) => (
        <DraftDepositItem
          key={deposit.workId}
          deposit={deposit}
          onDeleted={onDeleted}
          onResume={onResume}
        />
      ))}
    </div>
  );
}
