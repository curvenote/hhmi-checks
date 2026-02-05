import { useFetcher } from 'react-router';
import { SectionWithHeading, primitives, ui, useRevalidateOnInterval } from '@curvenote/scms-core';
import { ScanSearch } from 'lucide-react';
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

  useRevalidateOnInterval({
    enabled: checkedAvailableOrInProgress,
    interval: 3000,
  });

  const heading = checkedAvailableOrInProgress ? (
    <div className="flex gap-2 justify-between items-center">
      <div>Image Integrity Checks</div>
      <Logos.ProofigLogo className="h-8" />
    </div>
  ) : (
    <div>Image Integrity Checks</div>
  );
  return (
    <SectionWithHeading heading={heading} icon={ScanSearch}>
      <primitives.Card lift className="p-6">
        {checkedAvailableOrInProgress ? (
          <ProofigProgressComponent
            proofigData={metadata}
            isSubmitting={fetcher.state !== 'idle'}
          />
        ) : (
          <CTAPlaceholderPanel
            logo={<Logos.ProofigLogo className="mb-4 h-16" />}
            title="No image integrity checks run yet"
            description="Run image integrity checks to detect potential issues with images in your work."
            action={
              <ui.Button variant="default" disabled>
                Run checks now
              </ui.Button>
            }
          />
        )}
      </primitives.Card>
    </SectionWithHeading>
  );
}
