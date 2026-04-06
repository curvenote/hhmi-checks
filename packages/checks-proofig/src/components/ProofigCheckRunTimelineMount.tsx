import type { ExtensionCheckRunTimelineMountProps } from '@curvenote/scms-core';
import { ui } from '@curvenote/scms-core';
import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import {
  ALL_PENDING_STAGES,
  isProofigAwaitingSubimageApprovalInUi,
  proofigDataSchema,
} from '../schema.js';

/**
 * Headless work-details timeline mount: POST hydrate intent when this run is the latest Proofig run
 * for the version and the UI is awaiting sub-image approval. Renders outside the expandable tray.
 *
 * Implemented as a component (not a plain function) because we rely on `useFetcher` and
 * `useRevalidator` from react-router; those are hooks and must run inside a component under the
 * router (see `ExtensionCheckService.checkRunTimelineMountComponent` in scms-core).
 */
export function ProofigCheckRunTimelineMount({
  checkRunId,
  workVersionId,
  checkKind,
  metadata,
  remoteStatusActionPath,
  isLatestRunForKind,
}: ExtensionCheckRunTimelineMountProps) {
  const hydrateFetcher = useFetcher();
  const revalidator = useRevalidator();
  const hydrateRequestedRef = useRef(false);
  /** Avoid re-running the completion effect when `useRevalidator()` returns a new object each render (would spam `revalidate()`). */
  const lastHandledFetcherDataRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (checkKind !== 'proofig') return;
    if (hydrateRequestedRef.current) return;
    if (!isLatestRunForKind) return;
    if (!remoteStatusActionPath || !workVersionId || !checkRunId) return;
    const parsed = proofigDataSchema.safeParse(metadata);
    if (!parsed.success || !parsed.data.stages) return;
    const stages = { ...ALL_PENDING_STAGES, ...parsed.data.stages };
    if (!isProofigAwaitingSubimageApprovalInUi(stages)) return;
    hydrateRequestedRef.current = true;
    const fd = new FormData();
    fd.set('intent', 'proofig:hydrate-subimage-approval-status');
    fd.set('workVersionId', workVersionId);
    fd.set('checkRunId', checkRunId);
    hydrateFetcher.submit(fd, { method: 'post', action: remoteStatusActionPath });
  }, [
    checkKind,
    isLatestRunForKind,
    remoteStatusActionPath,
    workVersionId,
    checkRunId,
    metadata,
    hydrateFetcher,
  ]);

  useEffect(() => {
    if (hydrateFetcher.state !== 'idle' || !hydrateFetcher.data) return;
    if (lastHandledFetcherDataRef.current === hydrateFetcher.data) return;
    lastHandledFetcherDataRef.current = hydrateFetcher.data;
    const d = hydrateFetcher.data as { error?: { message?: string }; success?: boolean };
    if (d.error?.message) {
      ui.toastError(d.error.message);
      return;
    }
    if (d.success === true) {
      revalidator.revalidate();
    }
    // Omit `revalidator` from deps: the object from `useRevalidator()` can change identity every
    // render; with fetcher success data still present, that would re-fire this effect and spam revalidate.
  }, [hydrateFetcher.state, hydrateFetcher.data]);

  return null;
}
