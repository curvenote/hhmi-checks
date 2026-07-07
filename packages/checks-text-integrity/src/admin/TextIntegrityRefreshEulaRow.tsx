'use client';

import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { ui } from '@curvenote/scms-core';

const INTENT_REFRESH_EULA = 'text-integrity-refresh-eula';
const STATUS_INTENT = 'text-integrity-eula-cron-status';
const INSTALL_INTENT = 'text-integrity-install-eula-cron';

type RefreshEulaActionData = {
  success?: boolean;
  error?: { type: string; message: string };
  eula?: { version: string; date_fetched: string };
};

type EulaCronStatusResponse = {
  success?: boolean;
  eulaCron?: {
    installed: boolean;
    cronJob?: { schedule: string; enabled: boolean; nextRunAt: string | null };
  };
  error?: { message?: string };
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export function TextIntegrityRefreshEulaRow() {
  const fetcher = useFetcher<RefreshEulaActionData>();
  const statusFetcher = useFetcher<EulaCronStatusResponse>();
  const installFetcher = useFetcher<EulaCronStatusResponse>();
  const revalidator = useRevalidator();
  const prevStateRef = useRef(fetcher.state);
  const handledInstallRef = useRef<EulaCronStatusResponse | null>(null);

  const refreshBusy = fetcher.state !== 'idle';
  const cronBusy = statusFetcher.state !== 'idle' || installFetcher.state !== 'idle';
  const eulaCron = installFetcher.data?.eulaCron ?? statusFetcher.data?.eulaCron;
  const cronInstalled = eulaCron?.installed === true;

  useEffect(() => {
    const formData = new FormData();
    formData.append('intent', STATUS_INTENT);
    statusFetcher.submit(formData, { method: 'post' });
  }, []);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = fetcher.state;
    if (fetcher.state !== 'idle' || prev === 'idle' || !fetcher.data) return;

    const d = fetcher.data;
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }

    if (d.success && d.eula) {
      revalidator.revalidate();
      ui.toastSuccess('EULA cache refreshed', {
        description: `Version ${d.eula.version} (fetched ${d.eula.date_fetched}).`,
      });
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  useEffect(() => {
    if (installFetcher.state !== 'idle' || !installFetcher.data) return;
    if (handledInstallRef.current === installFetcher.data) return;
    handledInstallRef.current = installFetcher.data;

    if (installFetcher.data.error?.message) {
      ui.toastError(installFetcher.data.error.message);
      return;
    }

    if (installFetcher.data.success && installFetcher.data.eulaCron?.installed) {
      ui.toastSuccess('EULA refresh cron job installed');
      const formData = new FormData();
      formData.append('intent', STATUS_INTENT);
      statusFetcher.submit(formData, { method: 'post' });
    }
  }, [installFetcher.state, installFetcher.data, statusFetcher]);

  return (
    <div className="inline-flex flex-col gap-2 items-start">
      <fetcher.Form method="post" className="inline-flex">
        <input type="hidden" name="intent" value={INTENT_REFRESH_EULA} />
        <ui.StatefulButton
          type="submit"
          disabled={refreshBusy || cronBusy}
          size="sm"
          overlayBusy
          busy={refreshBusy}
        >
          Refresh EULA
        </ui.StatefulButton>
      </fetcher.Form>

      {statusFetcher.state !== 'idle' && !eulaCron ? (
        <p className="text-xs text-muted-foreground">Checking scheduled refresh…</p>
      ) : cronInstalled && eulaCron?.cronJob ? (
        <p className="text-xs text-muted-foreground">
          Scheduled refresh:{' '}
          <code className="text-[11px]">{eulaCron.cronJob.schedule}</code>
          {eulaCron.cronJob.enabled ? '' : ' (disabled)'} · next{' '}
          {formatTimestamp(eulaCron.cronJob.nextRunAt)}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Scheduled refresh cron not installed.
          </p>
          <installFetcher.Form method="post" className="inline-flex">
            <input type="hidden" name="intent" value={INSTALL_INTENT} />
            <ui.StatefulButton
              type="submit"
              size="sm"
              variant="outline"
              busy={installFetcher.state !== 'idle'}
              disabled={refreshBusy || cronBusy}
            >
              Install cron
            </ui.StatefulButton>
          </installFetcher.Form>
        </div>
      )}
    </div>
  );
}
