import type { ComponentProps } from 'react';
import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui } from '@curvenote/scms-core';

type RefreshFetcherData = {
  success?: boolean;
  error?: { type?: string; message?: string };
};

const INTENT = 'checks-text-integrity:relay-status';

export function TextIntegrityRefreshRemoteStatusButton({
  actionPath,
  workVersionId,
  checkRunId,
  buttonSize,
}: {
  actionPath: string;
  workVersionId: string;
  checkRunId?: string;
  buttonSize?: ComponentProps<typeof ui.StatefulButton>['size'];
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
  }, [fetcher.state, fetcher.data, revalidator]);

  const busy = fetcher.state !== 'idle';

  const refresh = () => {
    if (!checkRunId?.trim()) {
      ui.toastError('Check run is not ready yet.');
      return;
    }
    const fd = new FormData();
    fd.set('intent', INTENT);
    fd.set('workVersionId', workVersionId);
    fd.set('checkRunId', checkRunId.trim());
    fetcher.submit(fd, { method: 'post', action: actionPath });
  };

  return (
    <ui.StatefulButton variant="link" busy={busy} onClick={refresh} overlayBusy size={buttonSize}>
      Refresh status
    </ui.StatefulButton>
  );
}
