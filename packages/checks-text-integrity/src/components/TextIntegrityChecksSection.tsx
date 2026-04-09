import { useFetcher } from 'react-router';
import { useEffect } from 'react';
import { ui, useRevalidateOnInterval } from '@curvenote/scms-core';
import { ServiceLogo } from './ServiceLogo.js';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { TextIntegrityProgressComponent } from './TextIntegrityProgressComponent.js';
import { TextIntegrityResultsArea } from './TextIntegrityResultsArea.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import { canShowResults } from '../schema.js';

interface TextIntegrityChecksSectionProps {
  metadata: TextIntegrityDataSchema | undefined;
}

export function TextIntegrityChecksSection({ metadata }: TextIntegrityChecksSectionProps) {
  const fetcher = useFetcher();
  const hasData = !!metadata?.stages;
  const isSubmitting = fetcher.state === 'submitting';
  const showResults = canShowResults(metadata);
  const manifestLogo = metadata?.manifest?.logo;

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
        logo={<ServiceLogo manifestLogoUrl={manifestLogo} className="mb-4 h-16" />}
        title="No text integrity checks run yet"
        description="Run text integrity checks to verify text in your work."
        action={
          <fetcher.Form method="post">
            <ui.StatefulButton
              type="submit"
              variant="default"
              name="intent"
              value="checks-text-integrity:execute"
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
    return <TextIntegrityResultsArea metadata={metadata} />;
  }

  return (
    <div>
      <TextIntegrityProgressComponent metadata={metadata} />
    </div>
  );
}
