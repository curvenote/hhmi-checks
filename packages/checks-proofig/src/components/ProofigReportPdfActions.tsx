import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui, useCheckMaintenanceBlocked } from '@curvenote/scms-core';
import { Download } from 'lucide-react';
import type { ProofigDataSchema } from '../schema.js';
import { PROOFIG_REPORT_FILENAME, getProofigPdfReadiness } from '../proofigReportFiles.js';
import { ProofigActionOverflow, type ProofigOverflowMenuItem } from './ProofigActionOverflow.js';
import { ProofigRefreshRemoteStatusButton } from './ProofigRefreshRemoteStatusButton.js';

type ActionFetcherData = {
  success?: boolean;
  error?: { type?: string; message?: string };
};

function downloadHref(checkRunId: string): string {
  return `/app/checks-proofig/download-pdf/${encodeURIComponent(checkRunId)}`;
}

/**
 * Results / dialog toolbar for Proofig report PDF + optional remote Refresh.
 *
 * Shows one primary control (status, download, or Refresh alone). Additional actions
 * move into a kebab menu on the right when more than one control is needed.
 */
export function ProofigReportPdfActions({
  proofigData,
  workVersionId,
  checkRunId,
  actionPath,
  /** When true, integrate remote-status Refresh into the primary/kebab layout. */
  includeRemoteRefresh = false,
}: {
  proofigData: ProofigDataSchema | undefined;
  workVersionId?: string;
  checkRunId?: string;
  actionPath?: string;
  includeRemoteRefresh?: boolean;
}) {
  const { blocked, message: maintenanceMessage } = useCheckMaintenanceBlocked('proofig');
  const regenerateFetcher = useFetcher<ActionFetcherData>();
  const refreshFetcher = useFetcher<ActionFetcherData>();
  const revalidator = useRevalidator();
  const lastRegenRef = useRef<unknown>(undefined);
  const lastRefreshRef = useRef<unknown>(undefined);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (regenerateFetcher.state !== 'idle' || !regenerateFetcher.data) return;
    if (lastRegenRef.current === regenerateFetcher.data) return;
    lastRegenRef.current = regenerateFetcher.data;
    const d = regenerateFetcher.data;
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }
    if (d.success === true) {
      ui.toastSuccess('Regenerating report PDF — it will be available shortly.');
      revalidator.revalidate();
    }
  }, [regenerateFetcher.state, regenerateFetcher.data, revalidator]);

  useEffect(() => {
    if (refreshFetcher.state !== 'idle' || !refreshFetcher.data) return;
    if (lastRefreshRef.current === refreshFetcher.data) return;
    lastRefreshRef.current = refreshFetcher.data;
    const d = refreshFetcher.data;
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }
    if (d.success === true) {
      revalidator.revalidate();
    }
  }, [refreshFetcher.state, refreshFetcher.data, revalidator]);

  const runDownload = useCallback(async () => {
    if (!checkRunId) return;
    setDownloading(true);
    try {
      const res = await fetch(downloadHref(checkRunId), { credentials: 'same-origin' });
      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as {
          status?: string;
          message?: string;
          reason?: string;
        } | null;
        if (body?.status === 'failed') {
          ui.toastError(body.message ?? 'PDF generation failed.');
        } else {
          ui.toastInfo(body?.message ?? 'Report PDF is still generating — try again shortly.');
        }
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

  const canRefresh = Boolean(includeRemoteRefresh && actionPath?.trim() && workVersionId?.trim());
  const readiness = getProofigPdfReadiness(proofigData);
  const showPdfChrome = readiness !== 'not-final' && readiness !== 'no-url';

  if (!showPdfChrome && !canRefresh) return null;

  // Refresh alone — no kebab.
  if (!showPdfChrome) {
    return (
      <ProofigRefreshRemoteStatusButton
        actionPath={actionPath!.trim()}
        workVersionId={workVersionId!.trim()}
        checkRunId={checkRunId}
      />
    );
  }

  const stored = readiness === 'stored-current';
  const failed = readiness === 'failed';
  const regenBusy = regenerateFetcher.state !== 'idle';
  const refreshBusy = refreshFetcher.state !== 'idle';
  const canRegenerate = Boolean(
    actionPath?.trim() && workVersionId?.trim() && checkRunId?.trim(),
  );
  const pdfError = proofigData?.proofigReportPdfError?.trim();

  const submitRegenerate = () => {
    if (!canRegenerate || blocked || regenBusy) return;
    const fd = new FormData();
    fd.set('intent', 'regenerate-pdf');
    fd.set('workVersionId', workVersionId!.trim());
    fd.set('checkRunId', checkRunId!.trim());
    regenerateFetcher.submit(fd, { method: 'post', action: actionPath!.trim() });
  };

  const submitRefresh = () => {
    if (!canRefresh || blocked || refreshBusy) return;
    const fd = new FormData();
    fd.set('intent', 'refresh-remote-status');
    fd.set('workVersionId', workVersionId!.trim());
    if (checkRunId) fd.set('checkRunId', checkRunId);
    refreshFetcher.submit(fd, { method: 'post', action: actionPath!.trim() });
  };

  const regenerateLabel = failed
    ? 'Retry PDF generation'
    : stored
      ? 'Regenerate PDF'
      : 'Generate PDF';

  const menuItems: ProofigOverflowMenuItem[] = [];
  if (canRefresh) {
    menuItems.push({
      id: 'refresh',
      label: refreshBusy ? 'Refreshing…' : 'Refresh',
      onSelect: submitRefresh,
      disabled: blocked || refreshBusy,
    });
  }
  if (canRegenerate) {
    menuItems.push({
      id: 'regenerate-pdf',
      label: regenBusy ? 'Generating…' : regenerateLabel,
      onSelect: submitRegenerate,
      disabled: blocked || regenBusy,
    });
  }

  let primary: ReactNode;
  if (stored && checkRunId) {
    primary = (
      <ui.Button
        type="button"
        variant="outline"
        disabled={downloading}
        onClick={() => void runDownload()}
      >
        <Download className="w-4 h-4 mr-2" />
        {downloading ? 'Downloading…' : 'Download PDF'}
      </ui.Button>
    );
  } else if (failed) {
    const failedLabel = (
      <span className="text-sm font-normal text-destructive whitespace-nowrap">
        PDF Generation Failed
      </span>
    );
    primary = pdfError ? (
      <ui.SimpleTooltip title={pdfError} side="top">
        <span className="inline-flex cursor-help">{failedLabel}</span>
      </ui.SimpleTooltip>
    ) : (
      failedLabel
    );
  } else {
    primary = (
      <span className="text-sm font-normal opacity-50 animate-pulse text-primary whitespace-nowrap">
        Generating report PDF…
      </span>
    );
  }

  return (
    <ui.MaintenanceTooltip enabled={blocked} message={maintenanceMessage}>
      <ProofigActionOverflow primary={primary} menuItems={menuItems} />
    </ui.MaintenanceTooltip>
  );
}
