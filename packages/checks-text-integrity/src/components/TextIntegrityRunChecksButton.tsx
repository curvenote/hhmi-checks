'use client';

import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui, useCheckMaintenanceBlocked, useRevalidateOnInterval } from '@curvenote/scms-core';
import { TextIntegrityEulaDialog } from './TextIntegrityEulaDialog.js';
import { useTextIntegrityEulaEnable } from './useTextIntegrityEulaEnable.js';

/** Release busy if CTA→progress never arrives (thrown action, empty settle, stalled success). */
const HOLDING_BUSY_TIMEOUT_MS = 15_000;

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
  // Stay busy after execute until the CTA panel unmounts (or settle/timeout clears it).
  const [holdingBusy, setHoldingBusy] = useState(false);
  const isBusy = busy || executeFetcher.state !== 'idle' || holdingBusy;

  const canSubmit = Boolean(actionPath?.trim());
  const runExecute = () => {
    if (!canSubmit) return;
    const formData = new FormData();
    formData.append('intent', 'execute');
    formData.append('workVersionId', workVersionId);
    formData.append('trigger', 'checks_page');
    executeFetcher.submit(formData, { method: 'post', action: actionPath });
  };

  useEffect(() => {
    if (executeFetcher.state !== 'idle') setHoldingBusy(true);
  }, [executeFetcher.state]);

  useEffect(() => {
    if (executeFetcher.state !== 'idle') return;
    if (!holdingBusy) return;

    if (!executeFetcher.data) {
      // Thrown action / empty settle — allow retry.
      setHoldingBusy(false);
      return;
    }

    const err = (executeFetcher.data as { error?: { message?: string } }).error;
    if (err?.message) {
      ui.toastError(err.message);
      setHoldingBusy(false);
    }
    // success: keep holding until parent unmounts (CTA→progress) or timeout.
  }, [executeFetcher.state, executeFetcher.data, holdingBusy]);

  useEffect(() => {
    if (!holdingBusy) return;
    const to = setTimeout(() => setHoldingBusy(false), HOLDING_BUSY_TIMEOUT_MS);
    return () => clearTimeout(to);
  }, [holdingBusy]);

  // Keep revalidating while holding busy so the parent can swap CTA → progress.
  useRevalidateOnInterval({
    enabled: holdingBusy && executeFetcher.state === 'idle',
    interval: 1000,
  });

  return (
    <>
      <ui.MaintenanceTooltip enabled={blocked} message={message}>
        <ui.StatefulButton
          type="button"
          variant="default"
          busy={isBusy}
          disabled={blocked || !canSubmit}
          onClick={() => requestEnable(runExecute)}
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
