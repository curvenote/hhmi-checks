import { useState } from 'react';
import { useFetcher } from 'react-router';
import { Trash2 } from 'lucide-react';
import { ui } from '@curvenote/scms-core';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog.js';
import type { DraftPMCDeposit } from '../backend/db.server.js';
import { formatDistanceToNow } from 'date-fns';

interface DraftDepositItemProps {
  deposit: DraftPMCDeposit;
  onDeleted: () => void;
  onResume: (workId: string, submissionVersionId: string) => void;
}

export function DraftDepositItem({ deposit, onDeleted, onResume }: DraftDepositItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetcher = useFetcher();

  const handleResume = () => {
    onResume(deposit.workId, deposit.submissionVersionId);
  };

  const timeAgo = formatDistanceToNow(new Date(deposit.dateModified), { addSuffix: true });
  const createdAgo = formatDistanceToNow(new Date(deposit.dateCreated), { addSuffix: true });

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-muted-foreground">
                Last modified {timeAgo}
              </div>
              <div className="mb-3 text-xs text-muted-foreground">Created {createdAgo}</div>
            </div>
            <ui.Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700"
              disabled={fetcher.state !== 'idle'}
            >
              <Trash2 className="w-4 h-4" />
            </ui.Button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-medium text-gray-900 truncate">{deposit.workTitle}</h3>
            {deposit.versionNumber > 1 && (
              <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-md whitespace-nowrap">
                Version {deposit.versionNumber}
              </div>
            )}
          </div>
          <div className="mb-1 text-sm text-muted-foreground">
            {deposit.completionStatus.completed} out of {deposit.completionStatus.total} tasks
            completed
            {deposit.versionNumber > 1 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                This is version {deposit.versionNumber} of this deposit.
              </span>
            )}
          </div>
          <ui.Button
            onClick={handleResume}
            className="w-full mt-2"
            disabled={fetcher.state !== 'idle'}
          >
            Resume Deposit
          </ui.Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        workId={deposit.workId}
        workTitle={deposit.workTitle}
        onDeleted={onDeleted}
      />
    </>
  );
}
