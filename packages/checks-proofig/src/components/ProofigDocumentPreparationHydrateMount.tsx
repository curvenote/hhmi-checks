import type { ExtensionCheckRunTimelineMountProps } from '@curvenote/scms-core';
import { useEffect, useRef } from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import {
  ALL_PENDING_STAGES,
  isProofigAwaitingDocumentPreparationInUi,
  proofigDataSchema,
} from '../schema.js';

const HYDRATE_INTERVAL_MS = 2000;

type ProofigDocumentPreparationHydrateMountProps = Pick<
  ExtensionCheckRunTimelineMountProps,
  'checkRunId' | 'workVersionId' | 'checkKind' | 'metadata' | 'remoteStatusActionPath'
>;

/**
 * Headless mount: poll converter job status and sync `documentPreparation` on the check run.
 */
export function ProofigDocumentPreparationHydrateMount({
  checkRunId,
  workVersionId,
  checkKind,
  metadata,
  remoteStatusActionPath,
}: ProofigDocumentPreparationHydrateMountProps) {
  const hydrateFetcher = useFetcher();
  const { submit: hydrateSubmit, state: hydrateState } = hydrateFetcher;
  const hydrateStateRef = useRef(hydrateState);
  hydrateStateRef.current = hydrateState;
  const revalidator = useRevalidator();
  const lastHandledFetcherDataRef = useRef<unknown>(undefined);

  const parsed = proofigDataSchema.safeParse(metadata);
  const stages =
    parsed.success && parsed.data.stages ? { ...ALL_PENDING_STAGES, ...parsed.data.stages } : null;
  const awaitingPrep = stages != null && isProofigAwaitingDocumentPreparationInUi(stages);

  useEffect(() => {
    if (checkKind !== 'proofig') return;
    if (!awaitingPrep) return;
    if (!remoteStatusActionPath || !workVersionId || !checkRunId) return;

    const submitHydrate = () => {
      if (hydrateStateRef.current !== 'idle') return;
      const fd = new FormData();
      fd.set('intent', 'hydrate-document-preparation-status');
      fd.set('workVersionId', workVersionId);
      fd.set('checkRunId', checkRunId);
      hydrateSubmit(fd, { method: 'post', action: remoteStatusActionPath });
    };

    submitHydrate();
    const interval = window.setInterval(submitHydrate, HYDRATE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [awaitingPrep, checkKind, checkRunId, hydrateSubmit, remoteStatusActionPath, workVersionId]);

  useEffect(() => {
    if (hydrateFetcher.state !== 'idle' || !hydrateFetcher.data) return;
    if (lastHandledFetcherDataRef.current === hydrateFetcher.data) return;
    lastHandledFetcherDataRef.current = hydrateFetcher.data;
    const d = hydrateFetcher.data as { success?: boolean; updated?: boolean };
    if (d.success === true && d.updated === true && revalidator.state === 'idle') {
      revalidator.revalidate();
    }
  }, [hydrateFetcher.state, hydrateFetcher.data, revalidator]);

  return null;
}
