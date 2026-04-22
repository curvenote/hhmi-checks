import { useFetcher } from 'react-router';
import { useEffect } from 'react';
import { ui, useRevalidateOnInterval, ServiceLogo } from '@curvenote/scms-core';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { TextIntegrityProgressComponent } from './TextIntegrityProgressComponent.js';
import { TextIntegrityResultsArea } from './TextIntegrityResultsArea.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults, getTextIntegrityManifest } from '../schema.js';

interface TextIntegrityChecksSectionProps {
  metadata: TextIntegrityDataSchema | undefined;
  remoteStatusActionPath?: string;
  workVersionId?: string;
  checkRunId?: string;
}

export function TextIntegrityChecksSection({
  metadata,
  remoteStatusActionPath,
  workVersionId,
  checkRunId,
}: TextIntegrityChecksSectionProps) {
  const fetcher = useFetcher();
  const hasData = !!metadata?.stages;
  const isSubmitting = fetcher.state === 'submitting';
  const showResults = canShowResults(metadata);
  const manifest = getTextIntegrityManifest(metadata);
  const manifestLogo = manifest?.logo;
  const manifestTitle = manifest?.title;

  useRevalidateOnInterval({
    enabled: (hasData && !showResults) || isSubmitting,
    interval: isSubmitting && !hasData ? 1000 : 3000,
  });

  useEffect(() => {
    if (fetcher.state !== 'idle' || hasData || !fetcher.data) return;
    const err = (fetcher.data as { error?: { message?: string } }).error;
    if (err?.message) ui.toastError(err.message);
  }, [fetcher.state, fetcher.data, hasData]);

  if (!hasData) {
    return (
      <CTAPlaceholderPanel
        logo={
          <ServiceLogo
            logoUrl={manifestLogo}
            alt={manifestTitle}
            fallback={manifestTitle}
            className="mb-4 h-16"
          />
        }
        title="No text integrity checks run yet"
        description="Run text integrity checks to verify text in your work."
        action={
          <fetcher.Form method="post" action={remoteStatusActionPath}>
            <input type="hidden" name="workVersionId" value={workVersionId ?? ''} />
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
    );
  }

  if (showResults && !metadata.summaryReport) {
    return (
      <ui.SimpleAlert
        type="error"
        message="Processing completed but no summary report was received. Please contact support."
      />
    );
  }

  if (showResults && metadata.summaryReport) {
    return (
      <TextIntegrityResultsArea
        metadata={metadata}
        actionPath={remoteStatusActionPath}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
      />
    );
  }

  return (
    <div>
      <TextIntegrityProgressComponent metadata={metadata} />
    </div>
  );
}
