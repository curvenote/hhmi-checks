import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui, LoadingSpinner } from '@curvenote/scms-core';
import { DraftDepositList } from './DraftDepositList.js';
import type { DraftPMCDeposit } from '../backend/db.server.js';

interface ResumeDepositsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onResume: (workId: string, submissionVersionId: string) => void;
}

export function ResumeDepositsDialog({
  isOpen,
  onClose,
  onCreateNew,
  onResume,
}: ResumeDepositsDialogProps) {
  // using fetcher to load on demand, could use a loader pattern on the route hosting the dilog
  // if needed but this is more portable and deferred until the task is triggered
  const fetcher = useFetcher<{ drafts: DraftPMCDeposit[] }>();
  const [drafts, setDrafts] = useState<DraftPMCDeposit[]>([]);

  // Fetch drafts when dialog opens
  useEffect(() => {
    console.log('useEffect', isOpen, fetcher.state, fetcher.data);
    if (isOpen && fetcher.state === 'idle' && !fetcher.data) {
      const formData = new FormData();
      formData.append('intent', 'get-drafts');
      fetcher.submit(formData, {
        method: 'post',
        action: '/app/works/pmc',
      });
    }
  }, [isOpen, fetcher.state, fetcher.data]);

  // Update drafts when data is received
  useEffect(() => {
    if (fetcher.data?.drafts) {
      setDrafts(fetcher.data.drafts as DraftPMCDeposit[]);
    }
  }, [fetcher.data]);

  const handleDeleted = () => {
    // Refresh the drafts list after deletion
    const formData = new FormData();
    formData.append('intent', 'get-drafts');

    fetcher.submit(formData, {
      method: 'post',
      action: '/app/works/pmc',
    });
  };

  const handleResume = (workId: string, submissionVersionId: string) => {
    onResume(workId, submissionVersionId);
    onClose();
  };

  const handleCreateNew = () => {
    onCreateNew();
    onClose();
  };

  return (
    <ui.Dialog open={isOpen} onOpenChange={onClose}>
      <ui.DialogContent variant="wide">
        <ui.DialogHeader>
          <ui.DialogTitle>Resume Previous Deposit</ui.DialogTitle>
          <ui.DialogDescription>
            You have existing draft deposits. You can resume working on them or create a new
            deposit.
          </ui.DialogDescription>
        </ui.DialogHeader>

        <div className="max-h-96 overflow-y-auto py-4 max-h-[50vh]">
          {fetcher.state === 'loading' || fetcher.state === 'submitting' ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} color="text-blue-600" thickness={4} />
            </div>
          ) : (
            <DraftDepositList deposits={drafts} onDeleted={handleDeleted} onResume={handleResume} />
          )}
        </div>

        <ui.DialogFooter>
          <ui.DialogClose asChild>
            <ui.Button variant="outline">Cancel</ui.Button>
          </ui.DialogClose>
          <ui.Button onClick={handleCreateNew}>Create New Deposit</ui.Button>
        </ui.DialogFooter>
      </ui.DialogContent>
    </ui.Dialog>
  );
}
