import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { SectionWithHeading, primitives, ui } from '@curvenote/scms-core';
import { ScanSearch } from 'lucide-react';
import { Logos } from '../client.js';
import { ProofigProgressComponent } from './ProofigProgressComponent.js';
import { StateDebug } from './StateDebug.js';
import { useProofigDebugState } from './useProofigDebugState.js';
import type { ProofigDataSchema } from '../schema.js';
import type { WorkVersionMetadata } from '@curvenote/scms-server';
import type { ChecksMetadataSection } from './types.js';

// Re-export types that might be needed by consumers
// Note: ProofigDataSchema is exported from schema.js, so we don't re-export it here to avoid duplicates
export type { ChecksMetadataSection } from './types.js';

type WorkVersionMetadataWithChecks = WorkVersionMetadata & ChecksMetadataSection;

interface ImageIntegrityChecksSectionProps {
  metadata: WorkVersionMetadataWithChecks;
}

export function ImageIntegrityChecksSection({ metadata }: ImageIntegrityChecksSectionProps) {
  const fetcher = useFetcher();

  // Check if proofig is enabled in checks metadata
  const checksMetadata = metadata?.checks;
  const proofigEnabled = checksMetadata?.enabled?.includes('proofig');
  const proofigStatus = checksMetadata?.proofig as ProofigDataSchema | undefined;

  // Debug state hook for testing UI states
  const {
    isDebugMode,
    activeState,
    toggleDebugMode,
    setStageStatus,
    resetDebugState,
    applyPreset,
  } = useProofigDebugState(proofigStatus);

  // Check if we need to dispatch the initial POST
  // This happens when proofig is enabled, has a status object, but dispatched is false
  const shouldDispatch =
    proofigEnabled && proofigStatus && !proofigStatus.dispatched && !isDebugMode;

  // Auto-dispatch the initial POST to Proofig API when needed
  useEffect(() => {
    if (shouldDispatch && fetcher.state === 'idle') {
      // Dispatch action to trigger initial POST to Proofig
      fetcher.submit({ intent: 'proofig-initial-post' }, { method: 'POST' });
    }
  }, [shouldDispatch, fetcher]);

  // If proofig is enabled and has a status object, show progress
  const showProgress = proofigEnabled && activeState;

  const heading = showProgress ? (
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
        {showProgress && activeState ? (
          <ProofigProgressComponent
            proofigData={activeState}
            isSubmitting={fetcher.state !== 'idle'}
          />
        ) : (
          <div className="flex flex-col justify-center items-center py-8 text-center">
            <Logos.ProofigLogo className="mb-4 h-16" />
            <h3 className="mb-2 text-lg font-semibold">No image integrity checks run yet</h3>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
              Run image integrity checks to detect potential issues with images in your work.
            </p>
            <ui.Button variant="default" disabled>
              Run checks now
            </ui.Button>
          </div>
        )}
      </primitives.Card>
      <StateDebug
        proofigData={activeState}
        isDebugMode={isDebugMode}
        onToggleDebug={toggleDebugMode}
        onSetStageStatus={setStageStatus}
        onReset={resetDebugState}
        onApplyPreset={applyPreset}
      />
    </SectionWithHeading>
  );
}
