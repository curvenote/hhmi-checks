import { useFetcher } from 'react-router';
import { useEffect } from 'react';
import type { ExtensionCheckSectionActivityProps } from '@curvenote/scms-core';
import { ui, useRevalidateOnInterval } from '@curvenote/scms-core';
import { Logos } from '../client.js';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { ProofigProgressComponent } from './ProofigProgressComponent.js';
import type { ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, isProofigAwaitingDocumentPreparationInUi } from '../schema.js';

// Re-export types that might be needed by consumers
// Note: ProofigDataSchema is exported from schema.js, so we don't re-export it here to avoid duplicates
export type { ChecksMetadataSection } from './types.js';

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

  // Check if we need to dispatch the initial POST
  // If proofig is enabled and has a status object, show progress
  const checkedAvailableOrInProgress = !!metadata;
  const isSubmitting = fetcher.state === 'submitting';
  const stages = metadata?.stages ? { ...ALL_PENDING_STAGES, ...metadata.stages } : null;
  const awaitingDocumentPreparation =
    stages != null && isProofigAwaitingDocumentPreparationInUi(stages);

  // Poll when we have check data, while waiting for first response after submit, or during DOCX prep
  useRevalidateOnInterval({
    enabled: checkedAvailableOrInProgress || isSubmitting || awaitingDocumentPreparation,
    interval:
      isSubmitting && !checkedAvailableOrInProgress
        ? 1000
        : awaitingDocumentPreparation
          ? 2000
          : 3000,
  });

  // Show toast on initial fetcher error when still on CTA (no check data yet)
  useEffect(() => {
    if (fetcher.state !== 'idle' || checkedAvailableOrInProgress || !fetcher.data) return;
    const err = (fetcher.data as { error?: { message?: string } }).error;
    if (err?.message) ui.toastError(err.message);
  }, [fetcher.state, fetcher.data, checkedAvailableOrInProgress]);

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
            <fetcher.Form method="post" action={remoteStatusActionPath}>
              <input type="hidden" name="workVersionId" value={workVersionId} />
              <ui.StatefulButton
                type="submit"
                variant="default"
                name="intent"
                value="execute"
                busy={isSubmitting}
              >
                Run checks now
              </ui.StatefulButton>
            </fetcher.Form>
          }
        />
      )}
    </div>
  );
}
