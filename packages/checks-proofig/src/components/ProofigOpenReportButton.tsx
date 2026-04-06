import { useEffect, useRef, type ReactNode } from 'react';
import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

export type ProofigOpenReportFetcherData = {
  success?: boolean;
  proofigReportOpenUrl?: string;
  error?: { type?: string; message?: string };
};

/**
 * Resolves a current Proofig access token on the server, rewrites the `token` query param for
 * this open only, then opens the report in a new tab. Stored `report_url` is unchanged (still
 * updated by notify / remote status). Falls back to a plain link when routing context is incomplete.
 */
export function ProofigOpenReportButton({
  reportUrl,
  actionPath,
  workVersionId,
  checkRunId,
  disabled,
  children,
  variant = 'default',
  onOpenedProofig,
}: {
  reportUrl: string;
  actionPath?: string;
  workVersionId?: string;
  checkRunId?: string;
  disabled?: boolean;
  children: ReactNode;
  variant?: React.ComponentProps<typeof ui.Button>['variant'];
  /** Runs after a successful open (e.g. sub-image flow shows the refresh dialog). */
  onOpenedProofig?: () => void;
}) {
  const canServerOpen = Boolean(actionPath?.trim() && workVersionId?.trim() && checkRunId?.trim());

  if (!canServerOpen) {
    return (
      <ui.Button variant={variant} asChild disabled={disabled || !reportUrl.trim()}>
        <a href={reportUrl} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      </ui.Button>
    );
  }

  const fetcher = useFetcher<ProofigOpenReportFetcherData>();
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
    if (d.success === true && d.proofigReportOpenUrl) {
      window.open(d.proofigReportOpenUrl, '_blank', 'noopener,noreferrer');
      onOpenedProofig?.();
    }
  }, [fetcher.state, fetcher.data, onOpenedProofig]);

  const busy = fetcher.state !== 'idle';

  return (
    <ui.Button
      type="button"
      variant={variant}
      disabled={disabled || !reportUrl.trim() || busy}
      onClick={() => {
        const fd = new FormData();
        fd.set('intent', 'proofig:refresh-report-url');
        fd.set('workVersionId', workVersionId!.trim());
        fd.set('checkRunId', checkRunId!.trim());
        fetcher.submit(fd, { method: 'post', action: actionPath!.trim() });
      }}
    >
      {children}
    </ui.Button>
  );
}
