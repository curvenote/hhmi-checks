'use client';

import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { ui, useCheckMaintenanceBlocked } from '@curvenote/scms-core';
import { TextIntegrityEulaDialog } from './TextIntegrityEulaDialog.js';
import { useTextIntegrityEulaEnable } from './useTextIntegrityEulaEnable.js';

type TextIntegrityRunChecksButtonProps = {
  actionPath?: string;
  workVersionId: string;
};

export function TextIntegrityRunChecksButton({
  actionPath,
  workVersionId,
}: TextIntegrityRunChecksButtonProps) {
  const executeFetcher = useFetcher();
  const { blocked, message } = useCheckMaintenanceBlocked('checks-text-integrity');
  const { dialogOpen, setDialogOpen, eulaPresentation, requestEnable, acceptEula, busy } =
    useTextIntegrityEulaEnable(workVersionId);

  const runExecute = () => {
    const formData = new FormData();
    formData.append('intent', 'execute');
    formData.append('workVersionId', workVersionId);
    executeFetcher.submit(formData, { method: 'post', action: actionPath });
  };

  useEffect(() => {
    if (executeFetcher.state !== 'idle' || !executeFetcher.data) return;
    const err = (executeFetcher.data as { error?: { message?: string } }).error;
    if (err?.message) ui.toastError(err.message);
  }, [executeFetcher.state, executeFetcher.data]);

  return (
    <>
      <ui.MaintenanceTooltip enabled={blocked} message={message}>
        <ui.StatefulButton
          type="button"
          variant="default"
          busy={busy || executeFetcher.state === 'submitting'}
          disabled={blocked}
          onClick={() => {
            requestEnable(runExecute);
          }}
        >
          Run checks now
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
