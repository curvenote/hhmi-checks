'use client';

import { useFetcher } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { ExtensionCheckSectionActivityProps } from '@curvenote/scms-core';
import { ui, useCheckMaintenanceBlocked, useRevalidateOnInterval } from '@curvenote/scms-core';
import { ImageIntegrityTrackEvent } from '../analytics.catalog.js';
import { useChecksPingEvent } from '@hhmi/checks-shared/analytics/client';
import { Logos } from '../client.js';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { ProofigProgressComponent } from './ProofigProgressComponent.js';
import type { ProofigDataSchema } from '../schema.js';
import {
  ALL_PENDING_STAGES,
  KnownState,
  isProofigAwaitingDocumentPreparationInUi,
} from '../schema.js';

// Re-export types that might be needed by consumers
// Note: ProofigDataSchema is exported from schema.js, so we don't re-export it here to avoid duplicates
export type { ChecksMetadataSection } from './types.js';

/** Release busy if CTA→progress never arrives (thrown action, empty settle, stalled success). */
const HOLDING_BUSY_TIMEOUT_MS = 15_000;

type ImageIntegrityChecksSectionProps = ExtensionCheckSectionActivityProps & {
  metadata: ProofigDataSchema | undefined;
};

export function ImageIntegrityChecksSection({
  metadata,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: ImageIntegrityChecksSectionProps) {
  const fetcher = useFetcher();
  const pingEvent = useChecksPingEvent({ checkKind: 'proofig', workVersionId });
  const lastTrackedCheckRunIdRef = useRef<string | undefined>(undefined);
  const { blocked, message } = useCheckMaintenanceBlocked('proofig');
  // Stay busy after submit until the CTA swaps to progress (or settle/timeout clears it).
  const [holdingBusy, setHoldingBusy] = useState(false);

  // Check if we need to dispatch the initial POST
  // If proofig is enabled and has a status object, show progress
  const checkedAvailableOrInProgress = !!metadata;
  const isBusy = fetcher.state !== 'idle' || holdingBusy;
  const stages = metadata?.stages ? { ...ALL_PENDING_STAGES, ...metadata.stages } : null;
  const awaitingDocumentPreparation =
    stages != null && isProofigAwaitingDocumentPreparationInUi(stages);

  useEffect(() => {
    if (fetcher.state !== 'idle') setHoldingBusy(true);
  }, [fetcher.state]);

  // Parent stays mounted across CTA→progress; drop the latch once progress is shown.
  useEffect(() => {
    if (checkedAvailableOrInProgress) setHoldingBusy(false);
  }, [checkedAvailableOrInProgress]);

  // Poll when we have check data, while waiting for CTA→progress after submit, or during DOCX prep
  useRevalidateOnInterval({
    enabled: checkedAvailableOrInProgress || isBusy || awaitingDocumentPreparation,
    interval:
      isBusy && !checkedAvailableOrInProgress ? 1000 : awaitingDocumentPreparation ? 2000 : 3000,
  });

  // Settle: structured error / empty response releases busy; success keeps hold until progress/timeout.
  useEffect(() => {
    if (fetcher.state !== 'idle' || checkedAvailableOrInProgress) return;
    if (!holdingBusy) return;

    if (!fetcher.data) {
      setHoldingBusy(false);
      return;
    }

    const err = (fetcher.data as { error?: { message?: string } }).error;
    if (err?.message) {
      ui.toastError(err.message);
      setHoldingBusy(false);
    }
  }, [fetcher.state, fetcher.data, checkedAvailableOrInProgress, holdingBusy]);

  useEffect(() => {
    if (!holdingBusy) return;
    const to = setTimeout(() => setHoldingBusy(false), HOLDING_BUSY_TIMEOUT_MS);
    return () => clearTimeout(to);
  }, [holdingBusy]);

  useEffect(() => {
    const reportState = metadata?.summary?.state;
    const reportReady =
      reportState === KnownState.ReportClean || reportState === KnownState.ReportFlagged;
    if (!reportReady || !checkRunId || lastTrackedCheckRunIdRef.current === checkRunId) {
      return;
    }
    lastTrackedCheckRunIdRef.current = checkRunId;
    void pingEvent(ImageIntegrityTrackEvent.CHECKS_RESULTS_DISPLAYED, {
      checkRunId,
      proofigState: reportState,
    });
  }, [checkRunId, metadata?.summary?.state, pingEvent]);

  return (
    <div>
      {checkedAvailableOrInProgress ? (
        <ProofigProgressComponent
          proofigData={metadata}
          workVersionId={workVersionId}
          checkRunId={checkRunId}
          remoteStatusActionPath={remoteStatusActionPath}
        />
      ) : (
        <CTAPlaceholderPanel
          logo={<Logos.LogoThemed className="mb-4 h-16" />}
          title="No image integrity checks run yet"
          description="Run image integrity checks to detect potential issues with images in your work."
          action={
            remoteStatusActionPath ? (
              <ui.MaintenanceTooltip enabled={blocked} message={message}>
                <fetcher.Form method="post" action={remoteStatusActionPath}>
                  <input type="hidden" name="workVersionId" value={workVersionId} />
                  <input type="hidden" name="trigger" value="checks_page" />
                  <ui.StatefulButton
                    type="submit"
                    variant="default"
                    name="intent"
                    value="execute"
                    busy={isBusy}
                    disabled={blocked}
                  >
                    Run checks now
                  </ui.StatefulButton>
                </fetcher.Form>
              </ui.MaintenanceTooltip>
            ) : null
          }
        />
      )}
    </div>
  );
}
