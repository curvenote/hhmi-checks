import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';
import { ui } from '@curvenote/scms-core';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  workTitle: string;
  onDeleted: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  workId,
  workTitle,
  onDeleted,
}: DeleteConfirmationDialogProps) {
  const fetcher = useFetcher();
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false);

  const handleDelete = () => {
    setHasHandledSuccess(false); // Reset success handling state
    const formData = new FormData();
    formData.append('intent', 'delete-draft');
    formData.append('workId', workId);

    fetcher.submit(formData, {
      method: 'post',
      action: '/app/works/pmc',
    });
  };

  // Handle successful deletion
  useEffect(() => {
    if (
      !hasHandledSuccess &&
      fetcher.data &&
      typeof fetcher.data === 'object' &&
      'success' in fetcher.data &&
      (fetcher.data as any).success &&
      fetcher.state === 'idle'
    ) {
      setHasHandledSuccess(true);
      onDeleted();
      onClose();
    }
  }, [fetcher.data, fetcher.state, hasHandledSuccess, onDeleted, onClose]);

  // Reset success handling state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasHandledSuccess(false);
    }
  }, [isOpen]);

  return (
    <ui.Dialog open={isOpen} onOpenChange={onClose}>
      <ui.DialogContent>
        <ui.DialogHeader>
          <ui.DialogTitle>Delete Draft Deposit</ui.DialogTitle>
          <ui.DialogDescription>
            Are you sure you want to delete the draft deposit "{workTitle}"? This action cannot be
            undone.
          </ui.DialogDescription>
        </ui.DialogHeader>
        <ui.DialogFooter>
          <ui.DialogClose asChild>
            <ui.Button variant="outline" disabled={fetcher.state !== 'idle'}>
              Cancel
            </ui.Button>
          </ui.DialogClose>
          <ui.Button
            variant="destructive"
            onClick={handleDelete}
            disabled={fetcher.state !== 'idle'}
          >
            {fetcher.state !== 'idle' ? 'Deleting...' : 'Delete Draft'}
          </ui.Button>
        </ui.DialogFooter>
      </ui.DialogContent>
    </ui.Dialog>
  );
}
