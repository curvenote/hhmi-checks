import { useFetcher } from 'react-router';
import { useEffect } from 'react';
import { ui, useRevalidateOnInterval } from '@curvenote/scms-core';
import { Logos } from '../client.js';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { ProofigProgressComponent } from './ProofigProgressComponent.js';
import type { ProofigDataSchema } from '../schema.js';

// Re-export types that might be needed by consumers
// Note: ProofigDataSchema is exported from schema.js, so we don't re-export it here to avoid duplicates
export type { ChecksMetadataSection } from './types.js';

interface ImageIntegrityChecksSectionProps {
  metadata: ProofigDataSchema | undefined;
}

export function ImageIntegrityChecksSection({ metadata }: ImageIntegrityChecksSectionProps) {
  const fetcher = useFetcher();

  // Check if we need to dispatch the initial POST
  // If proofig is enabled and has a status object, show progress
  const checkedAvailableOrInProgress = !!metadata;
  const isSubmitting = fetcher.state === 'submitting';

  // Poll when we have check data, or while waiting for first response after submit
  useRevalidateOnInterval({
    enabled: checkedAvailableOrInProgress || isSubmitting,
    interval: isSubmitting && !checkedAvailableOrInProgress ? 1000 : 3000,
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
        <ProofigProgressComponent proofigData={metadata} />
      ) : (
        <CTAPlaceholderPanel
          logo={<Logos.ProofigLogo className="mb-4 h-16" />}
          title="No image integrity checks run yet"
          description="Run image integrity checks to detect potential issues with images in your work."
          action={
            <fetcher.Form method="post">
              <ui.StatefulButton
                type="submit"
                variant="default"
                name="intent"
                value="proofig:execute"
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
