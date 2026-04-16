import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui } from '@curvenote/scms-core';

export interface TextIntegrityPdfReportStatusProps {
  reportGenerationComplete: boolean;
  reportGenerationFailed: boolean;
  waitingForReport: boolean;
  checkRunId?: string;
  workVersionId?: string;
  actionPath?: string;
}

type RetryFetcherData = {
  success?: boolean;
  error?: { message?: string };
};

export function TextIntegrityPdfReportStatus({
  reportGenerationComplete,
  reportGenerationFailed,
  waitingForReport,
  checkRunId,
  workVersionId,
  actionPath,
}: TextIntegrityPdfReportStatusProps) {
  const revalidator = useRevalidator();
  const retryFetcher = useFetcher<RetryFetcherData>();
  const lastRetryRef = useRef<unknown>(undefined);
  const [retried, setRetried] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (retryFetcher.state !== 'idle' || !retryFetcher.data) return;
    if (lastRetryRef.current === retryFetcher.data) return;
    lastRetryRef.current = retryFetcher.data;
    const d = retryFetcher.data;
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }
    if (d.success) {
      setRetried(true);
      revalidator.revalidate();
    }
  }, [retryFetcher.state, retryFetcher.data, revalidator]);

  const downloadUrl = checkRunId
    ? `/app/checks-text-integrity/download-pdf/${encodeURIComponent(checkRunId)}`
    : undefined;
  const canDownload = reportGenerationComplete && Boolean(downloadUrl);
  const canRetry =
    reportGenerationFailed && Boolean(actionPath?.trim()) && Boolean(checkRunId?.trim());
  const retryBusy = retryFetcher.state !== 'idle';

  const handleDownload = useCallback(async () => {
    if (!downloadUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(downloadUrl, { credentials: 'same-origin' });
      if (!res.ok) {
        ui.toastError(`Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition');
      let filename = 'similarity-report.pdf';
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
        if (m?.[1]) filename = m[1].trim();
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      ui.toastError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, [downloadUrl]);

  return (
    <div>
      {canDownload && (
        <ui.Button variant="link" disabled={downloading} onClick={handleDownload}>
          {downloading ? 'Downloading…' : 'Download PDF report'}
        </ui.Button>
      )}
      {reportGenerationComplete && !canDownload && (
        <span className="text-sm font-normal text-muted-foreground">
          Similarity PDF report generated
        </span>
      )}
      {canRetry && !retried && (
        <retryFetcher.Form method="post" action={actionPath}>
          <input type="hidden" name="intent" value="restart-similarity-pdf" />
          <input type="hidden" name="workVersionId" value={workVersionId ?? ''} />
          <input type="hidden" name="checkRunId" value={checkRunId ?? ''} />
          <ui.Button type="submit" variant="link" disabled={retryBusy}>
            {retryBusy ? 'Retrying…' : 'Retry PDF generation'}
          </ui.Button>
        </retryFetcher.Form>
      )}
      {(waitingForReport || retried) && (
        <span className="text-sm font-normal opacity-50 animate-pulse text-primary">
          Waiting for PDF report…
        </span>
      )}
    </div>
  );
}
