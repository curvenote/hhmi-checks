import { useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { ui, ServiceLogo } from '@curvenote/scms-core';

type ViewReportFetcherData = {
  success?: boolean;
  viewerUrl?: string;
  error?: { message: string };
};

interface ViewReportFormProps {
  actionPath?: string;
  workVersionId?: string;
  checkRunId?: string;
  manifestLogoUrl?: string;
  manifestTitle?: string;
}

export function ViewReportForm({
  actionPath,
  workVersionId,
  checkRunId,
  manifestLogoUrl,
  manifestTitle,
}: ViewReportFormProps) {
  const fetcher = useFetcher<ViewReportFetcherData>();
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
    if (d.success === true && d.viewerUrl) {
      window.open(d.viewerUrl, '_blank', 'noopener,noreferrer');
    }
  }, [fetcher.state, fetcher.data]);

  const busy = fetcher.state !== 'idle';
  const canOpen = Boolean(actionPath?.trim() && workVersionId?.trim() && checkRunId?.trim());

  return (
    <fetcher.Form method="post" action={actionPath}>
      <input type="hidden" name="intent" value="refresh-viewer-url" />
      <input type="hidden" name="workVersionId" value={workVersionId ?? ''} />
      <input type="hidden" name="checkRunId" value={checkRunId ?? ''} />
      <ui.Button type="submit" variant="default" disabled={!canOpen || busy}>
        <span className="flex gap-2 items-center">
          {busy ? <span>Opening report…</span> : <span>View report at</span>}
          <ServiceLogo
            logoUrl={manifestLogoUrl}
            alt={manifestTitle}
            fallback={manifestTitle}
            className="h-3 invert brightness-10"
          />
        </span>
      </ui.Button>
    </fetcher.Form>
  );
}
