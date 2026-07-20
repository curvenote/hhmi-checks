import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui, useCheckMaintenanceBlocked } from '@curvenote/scms-core';
import { Download, RefreshCw } from 'lucide-react';
import type { ProofigDataSchema } from '../schema.js';
import { PROOFIG_REPORT_FILENAME, getProofigPdfReadiness } from '../proofigReportFiles.js';

type RegenerateFetcherData = {
  success?: boolean;
  error?: { type?: string; message?: string };
};

function downloadHref(checkRunId: string): string {
  return `/app/checks-proofig/download-pdf/${encodeURIComponent(checkRunId)}`;
}

/**
 * Download / regenerate actions for the persisted Proofig report PDF.
 *
 * Only rendered at the final report stage (Clean / Flagged). Download is enabled once a PDF has
 * been stored for the current report id. Generate/Regenerate is always offered when a report URL
 * is available so a failed first auto-persist can be retried with `force`.
 */
export function ProofigReportPdfActions({
  proofigData,
  workVersionId,
  checkRunId,
  actionPath,
}: {
  proofigData: ProofigDataSchema | undefined;
  workVersionId?: string;
  checkRunId?: string;
  actionPath?: string;
}) {
  const { blocked, message } = useCheckMaintenanceBlocked('proofig');
  const fetcher = useFetcher<RegenerateFetcherData>();
  const revalidator = useRevalidator();
  const lastHandledFetcherDataRef = useRef<unknown>(undefined);
  const [downloading, setDownloading] = useState(false);

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
      ui.toastSuccess('Regenerating report PDF — it will be available shortly.');
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const runDownload = useCallback(async () => {
    if (!checkRunId) return;
    setDownloading(true);
    try {
      const res = await fetch(downloadHref(checkRunId), { credentials: 'same-origin' });
      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
          reason?: string;
        } | null;
        ui.toastInfo(body?.message ?? 'Report PDF is still generating — try again shortly.');
        // Metadata may have been cleared (e.g. CDN object missing); refresh actions.
        revalidator.revalidate();
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        ui.toastError(body?.message ?? `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition');
      let filename = PROOFIG_REPORT_FILENAME;
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
  }, [checkRunId, revalidator]);

  const readiness = getProofigPdfReadiness(proofigData);
  if (readiness === 'not-final') return null;

  const stored = readiness === 'stored-current';
  const busy = fetcher.state !== 'idle';
  const canRegenerate = Boolean(
    actionPath?.trim() && workVersionId?.trim() && checkRunId?.trim() && readiness !== 'no-url',
  );

  const submitRegenerate = () => {
    if (!canRegenerate) return;
    const fd = new FormData();
    fd.set('intent', 'regenerate-pdf');
    fd.set('workVersionId', workVersionId!.trim());
    fd.set('checkRunId', checkRunId!.trim());
    fetcher.submit(fd, { method: 'post', action: actionPath!.trim() });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stored && checkRunId ? (
        <ui.Button
          type="button"
          variant="outline"
          disabled={downloading}
          onClick={() => void runDownload()}
        >
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Downloading…' : 'Download PDF'}
        </ui.Button>
      ) : (
        <span className="text-sm font-normal opacity-50 animate-pulse text-primary">
          {busy ? 'Generating report PDF…' : 'Preparing report PDF…'}
        </span>
      )}
      <ui.MaintenanceTooltip enabled={blocked} message={message}>
        <ui.Button
          type="button"
          variant="ghost"
          disabled={!canRegenerate || blocked || busy}
          onClick={submitRegenerate}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Generating…' : stored ? 'Regenerate PDF' : 'Generate PDF'}
        </ui.Button>
      </ui.MaintenanceTooltip>
    </div>
  );
}
