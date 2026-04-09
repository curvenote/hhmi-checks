import type { TextIntegrityDataSchema } from '../schema.js';
import { ServiceLogo } from './ServiceLogo.js';
import { SimilarityScoresBlock } from './SimilarityScoresBlock.js';
import { TopMatchesBlock } from './TopMatchesBlock.js';
import { ui } from '@curvenote/scms-core';

interface TextIntegrityResultsAreaProps {
  metadata: TextIntegrityDataSchema;
}

export function TextIntegrityResultsArea({ metadata }: TextIntegrityResultsAreaProps) {
  const { summaryReport, reportPdfUrl, stages } = metadata;
  const waitingForReport =
    stages?.reportGeneration?.status === 'processing' ||
    stages?.reportGeneration?.status === 'pending';
  const reportGenerationComplete = stages?.reportGeneration?.status === 'completed';
  const reportGenerationError = stages?.reportGeneration?.status === 'error';
  const hasPdfUrl = !!reportPdfUrl;

  if (!summaryReport) return null;

  return (
    <div className="flex flex-col gap-8">
      <SimilarityScoresBlock report={summaryReport} />
      <TopMatchesBlock report={summaryReport} />

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <ui.Button variant="default" asChild>
          <a href={'https://www.google.com'} target="_blank" rel="noopener noreferrer">
            <span className="flex gap-2 items-center">
              <span>View report at</span>
              <ServiceLogo manifestLogoUrl={metadata.manifest?.logo} className="h-4 grayscale" />
            </span>
          </a>
        </ui.Button>
        <div>
          {reportGenerationComplete && hasPdfUrl && (
            <ui.Button variant="link" asChild>
              <a href={reportPdfUrl} target="_blank" rel="noopener noreferrer" download>
                Download PDF report
              </a>
            </ui.Button>
          )}
          {waitingForReport && (
            <span className="text-sm font-normal opacity-50 animate-pulse text-primary">
              Waiting for PDF report…
            </span>
          )}
          {reportGenerationComplete && !hasPdfUrl && (
            <span className="text-sm font-normal text-muted-foreground">
              PDF report not available
            </span>
          )}
          {reportGenerationError && (
            <span className="text-sm font-normal text-destructive/70">PDF report error</span>
          )}
        </div>
      </div>
    </div>
  );
}
