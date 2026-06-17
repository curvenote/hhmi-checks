'use client';

import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

const LIST_INTENT = 'proofig-list-failed-runs';
const RETRY_INTENT = 'proofig-retry-failed-run';
const BULK_RETRY_INTENT = 'proofig-retry-failed-runs-bulk';

type FailedRunRow = {
  id: string;
  workVersionId: string;
  workId: string;
  dateCreated: string;
  errorSummary: string;
  submitterId: string | null;
  submitterEmail: string | null;
  submitterName: string | null;
};

type ListResponse = {
  success?: boolean;
  runs?: FailedRunRow[];
  error?: { message?: string };
};

type RetryResponse = {
  success?: boolean;
  results?: Array<{ runId: string; ok: boolean; message?: string; checkRunId?: string }>;
  error?: { message?: string };
};

function formatSubmitter(row: FailedRunRow): string {
  if (row.submitterName?.trim()) return row.submitterName.trim();
  if (row.submitterEmail?.trim()) return row.submitterEmail.trim();
  if (row.submitterId) return row.submitterId;
  return '—';
}

export function ProofigFailedRunsAdminPanel() {
  const listFetcher = useFetcher<ListResponse>();
  const retryFetcher = useFetcher<RetryResponse>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const handledRetryRef = useRef<RetryResponse | null>(null);

  const runs = listFetcher.data?.runs ?? [];
  const listBusy = listFetcher.state !== 'idle';
  const retryBusy = retryFetcher.state !== 'idle';

  useEffect(() => {
    const formData = new FormData();
    formData.append('intent', LIST_INTENT);
    listFetcher.submit(formData, { method: 'post' });
    // Load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listFetcher.state !== 'idle' || !listFetcher.data?.error?.message) return;
    ui.toastError(listFetcher.data.error.message);
  }, [listFetcher.state, listFetcher.data]);

  useEffect(() => {
    if (retryFetcher.state !== 'idle' || !retryFetcher.data) return;
    if (handledRetryRef.current === retryFetcher.data) return;
    handledRetryRef.current = retryFetcher.data;

    if (retryFetcher.data.error?.message) {
      ui.toastError(retryFetcher.data.error.message);
      return;
    }

    const results = retryFetcher.data.results ?? [];
    const succeeded = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => !r.ok).length;
    if (succeeded > 0) {
      ui.toastSuccess(`Retried ${succeeded} failed run${succeeded === 1 ? '' : 's'}`);
    }
    if (skipped > 0) {
      ui.toastError(`${skipped} run${skipped === 1 ? '' : 's'} could not be retried`);
    }

    setSelected(new Set());
    const formData = new FormData();
    formData.append('intent', LIST_INTENT);
    listFetcher.submit(formData, { method: 'post' });
  }, [retryFetcher.state, retryFetcher.data, listFetcher]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === runs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(runs.map((r) => r.id)));
    }
  };

  const submitRetry = (runIds: string[]) => {
    const formData = new FormData();
    formData.append('intent', runIds.length === 1 ? RETRY_INTENT : BULK_RETRY_INTENT);
    for (const id of runIds) {
      formData.append('runIds', id);
    }
    retryFetcher.submit(formData, { method: 'post' });
  };

  return (
    <div className="p-4 space-y-4 rounded-md border border-border md:col-span-2">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h3 className="text-sm font-medium">Failed check runs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Retry failed Proofig runs on behalf of the original submitter.
          </p>
        </div>
        <ui.StatefulButton
          type="button"
          size="sm"
          variant="outline"
          busy={listBusy}
          disabled={listBusy}
          onClick={() => {
            const formData = new FormData();
            formData.append('intent', LIST_INTENT);
            listFetcher.submit(formData, { method: 'post' });
          }}
        >
          Refresh
        </ui.StatefulButton>
      </div>

      {listBusy && runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading failed runs…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No failed runs found.</p>
      ) : (
        <div className="overflow-auto max-h-80 rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left border-b border-border">
                <th className="p-2 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === runs.length && runs.length > 0}
                    onChange={toggleAll}
                    aria-label="Select all failed runs"
                  />
                </th>
                <th className="p-2">Work</th>
                <th className="p-2">Submitter</th>
                <th className="p-2">Failed</th>
                <th className="p-2">Error</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {runs.map((row) => (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select run ${row.id}`}
                    />
                  </td>
                  <td className="p-2 font-mono text-xs">{row.workId}</td>
                  <td className="p-2">{formatSubmitter(row)}</td>
                  <td className="p-2 whitespace-nowrap">
                    {new Date(row.dateCreated).toLocaleString()}
                  </td>
                  <td className="p-2 max-w-xs truncate" title={row.errorSummary}>
                    {row.errorSummary}
                  </td>
                  <td className="p-2">
                    <ui.StatefulButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      busy={retryBusy}
                      disabled={retryBusy}
                      onClick={() => submitRetry([row.id])}
                    >
                      Retry
                    </ui.StatefulButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 ? (
        <ui.StatefulButton
          type="button"
          size="sm"
          busy={retryBusy}
          disabled={retryBusy}
          onClick={() => submitRetry([...selected])}
        >
          Retry selected ({selected.size})
        </ui.StatefulButton>
      ) : null}
    </div>
  );
}
