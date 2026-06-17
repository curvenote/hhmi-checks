import { ui, useRevalidateOnInterval, ServiceLogo } from '@curvenote/scms-core';
import { TextIntegrityRunChecksButton } from './TextIntegrityRunChecksButton.js';
import { TextIntegrityCheckRunRetryButton } from './TextIntegrityCheckRunRetryButton.js';
import { CTAPlaceholderPanel } from './CTAPlaceholderPanel.js';
import { TextIntegrityProgressComponent } from './TextIntegrityProgressComponent.js';
import { TextIntegrityResultsArea } from './TextIntegrityResultsArea.js';
import type { TextIntegrityDataSchema } from '../schema.js';
import {
  canShowResults,
  getTextIntegrityManifest,
  isAwaitingInitialTextIntegrityStages,
  shouldPollTextIntegrityChecks,
} from '../schema.js';

interface TextIntegrityChecksSectionProps {
  metadata: TextIntegrityDataSchema | undefined;
  remoteStatusActionPath?: string;
  workVersionId?: string;
  checkRunId?: string;
  /** ISO `CheckServiceRun.date_modified` — used to decide when refresh / stale UI is shown. */
  checkRunDateModified?: string;
}

export function TextIntegrityChecksSection({
  metadata,
  remoteStatusActionPath,
  workVersionId,
  checkRunId,
  checkRunDateModified,
}: TextIntegrityChecksSectionProps) {
  const hasData = !!metadata?.stages;
  const showResults = canShowResults(metadata);
  const awaitingInitialStages = isAwaitingInitialTextIntegrityStages(metadata, checkRunId);
  const manifest = getTextIntegrityManifest(metadata);
  const manifestLogo = manifest?.logo;
  const manifestTitle = manifest?.title;

  useRevalidateOnInterval({
    enabled: shouldPollTextIntegrityChecks(metadata, checkRunId),
    interval: awaitingInitialStages ? 2000 : 3000,
  });

  if (!hasData) {
    return (
      <CTAPlaceholderPanel
        logo={
          <ServiceLogo
            logoUrl={manifestLogo}
            alt={manifestTitle}
            fallback={manifestTitle}
            className="mb-4 h-8"
          />
        }
        title="No text integrity checks run yet"
        description="Run text integrity checks to verify text in your work."
        action={
          workVersionId ? (
            <TextIntegrityRunChecksButton
              actionPath={remoteStatusActionPath}
              workVersionId={workVersionId}
            />
          ) : null
        }
      />
    );
  }

  if (showResults && !metadata.summaryReport) {
    return (
      <div className="flex flex-col gap-4">
        <ui.SimpleAlert
          type="error"
          message="Processing completed but no summary report was received. Please contact support."
        />
        {workVersionId ? (
          <TextIntegrityCheckRunRetryButton
            actionPath={remoteStatusActionPath}
            workVersionId={workVersionId}
            checkRunId={checkRunId}
          />
        ) : null}
      </div>
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
      <TextIntegrityProgressComponent
        metadata={metadata}
        actionPath={remoteStatusActionPath}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        checkRunDateModified={checkRunDateModified}
      />
    </div>
  );
}
