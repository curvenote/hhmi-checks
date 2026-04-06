import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui } from '@curvenote/scms-core';

type RefreshFetcherData = {
  success?: boolean;
  error?: { type?: string; message?: string };
};

export function ProofigRefreshRemoteStatusButton({
  actionPath,
  workVersionId,
  checkRunId,
}: {
  actionPath: string;
  workVersionId: string;
  checkRunId?: string;
}) {
  const fetcher = useFetcher<RefreshFetcherData>();
  const revalidator = useRevalidator();
  const lastHandledFetcherDataRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    if (lastHandledFetcherDataRef.current === fetcher.data) return;
    lastHandledFetcherDataRef.current = fetcher.data;
    const d = fetcher.data;
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }
    if (d.success === true) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);

  const busy = fetcher.state !== 'idle';

  const refresh = () => {
    const fd = new FormData();
    fd.set('intent', 'proofig:refresh-remote-status');
    fd.set('workVersionId', workVersionId);
    if (checkRunId) fd.set('checkRunId', checkRunId);
    fetcher.submit(fd, { method: 'post', action: actionPath });
  };

  return (
    <ui.StatefulButton variant="link" busy={busy} onClick={refresh} overlayBusy>
      Get Latest Status
    </ui.StatefulButton>
  );
}
