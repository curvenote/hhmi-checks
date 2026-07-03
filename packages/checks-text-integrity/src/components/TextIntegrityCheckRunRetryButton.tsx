'use client';

import { useEffect } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui, useCheckMaintenanceBlocked } from '@curvenote/scms-core';
import { TextIntegrityEulaDialog } from './TextIntegrityEulaDialog.js';
import { useTextIntegrityEulaEnable } from './useTextIntegrityEulaEnable.js';

type TextIntegrityCheckRunRetryButtonProps = {
  actionPath?: string;
  workVersionId: string;
  checkRunId?: string;
};

export function TextIntegrityCheckRunRetryButton({
  actionPath,
  workVersionId,
  checkRunId,
}: TextIntegrityCheckRunRetryButtonProps) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const { blocked, message } = useCheckMaintenanceBlocked('checks-text-integrity');
  const { dialogOpen, setDialogOpen, eulaPresentation, requestEnable, acceptEula, busy } =
    useTextIntegrityEulaEnable(workVersionId);
  const canRetry = Boolean(actionPath && checkRunId?.trim());
  const submitting = fetcher.state === 'submitting';

  const runRetry = () => {
    if (!actionPath || !checkRunId?.trim()) return;
    const formData = new FormData();
    formData.append('intent', 'retry');
    formData.append('workVersionId', workVersionId);
    formData.append('checkRunId', checkRunId);
    fetcher.submit(formData, { method: 'post', action: actionPath });
  };

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const data = fetcher.data as { error?: { message?: string }; success?: boolean };
    if (data.error?.message) ui.toastError(data.error.message);
    else if (data.success) {
      ui.toastSuccess('Text integrity check retry started');
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  if (!canRetry) return null;

  return (
    <>
      <ui.MaintenanceTooltip enabled={blocked} message={message}>
        <ui.StatefulButton
          type="button"
          variant="outline"
          busy={busy || submitting}
          disabled={blocked}
          onClick={() => requestEnable(runRetry)}
        >
          Retry check
        </ui.StatefulButton>
      </ui.MaintenanceTooltip>
      {eulaPresentation ? (
        <TextIntegrityEulaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          html={eulaPresentation.html}
          url={eulaPresentation.url}
          version={eulaPresentation.version}
          busy={busy}
          onAccept={acceptEula}
        />
      ) : null}
    </>
  );
}
