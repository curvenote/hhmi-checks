import type { ReactNode } from 'react';
import { extensionPackageTitle } from '../meta.js';
import { WebhookEvent, type TextIntegrityDataSchema } from '../schema.js';
import { ProcessingProgressArea } from '../components/progress/ProcessingProgressArea.js';
import { SimpleErrorArea } from '../components/progress/SimpleErrorArea.js';
import { StageProgressArea } from '../components/progress/StageProgressArea.js';
import { SubmissionCompleteProgressArea } from '../components/progress/SubmissionCompleteProgressArea.js';
import { SubmittingProgressArea } from '../components/progress/SubmittingProgressArea.js';
import { TextIntegrityResultsArea } from '../components/TextIntegrityResultsArea.js';

const TWO_MIN_AGO_ISO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const FIVE_MIN_AGO_ISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const THIRTY_SEC_AGO_ISO = new Date(Date.now() - 30 * 1000).toISOString();

const SAMPLE_RESULTS_DATA: TextIntegrityDataSchema = {
  externalId: 'demo-external-123',
  submissionId: 'demo-submission-456',
  externalRef: 'demo-provider-789',
  reportPdfId: 'demo-pdf-001',
  manifest: {
    name: 'demo-text-integrity',
    title: 'Demo Text Integrity Service',
    logo: '',
    version: '1.0.0',
  },
  stages: {
    submission: {
      status: 'completed',
      history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: FIVE_MIN_AGO_ISO,
    },
    processing: {
      status: 'completed',
      history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: TWO_MIN_AGO_ISO,
    },
    reportGeneration: {
      status: 'completed',
      history: [{ status: 'processing', timestamp: TWO_MIN_AGO_ISO }],
      timestamp: THIRTY_SEC_AGO_ISO,
    },
  },
  latest: {
    event: WebhookEvent.ReportGenerationComplete,
    receivedAt: THIRTY_SEC_AGO_ISO,
    overallMatchPercentage: 32,
    reportPdfId: 'demo-pdf-001',
  },
  summaryReport: {
    submissionId: 'demo-submission-456',
    overallMatchPercentage: 32,
    internetMatchPercentage: 18,
    publicationMatchPercentage: 9,
    submittedWorksMatchPercentage: 5,
    status: 'COMPLETE',
    timeRequested: FIVE_MIN_AGO_ISO,
    timeGenerated: THIRTY_SEC_AGO_ISO,
    topSourceLargestMatchedWordCount: 142,
    topMatches: [
      {
        percentage: 14,
        sourceType: 'INTERNET',
        matchedWordCountTotal: 412,
        name: 'example.com/article-on-related-topic',
      },
      {
        percentage: 9,
        sourceType: 'PUBLICATION',
        matchedWordCountTotal: 268,
        name: 'A Recent Survey of the Field',
        submittedDate: '2024-08-12',
        institutionName: 'Journal of Examples',
      },
      {
        percentage: 5,
        sourceType: 'SUBMITTED',
        matchedWordCountTotal: 154,
        name: 'Earlier draft submitted by collaborator',
        submittedDate: '2024-04-02',
        institutionName: 'Demo University',
      },
    ],
  },
};

function DesignSection({
  name,
  description,
  children,
}: {
  name: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h3 className="font-mono text-base font-semibold text-gray-900 dark:text-white">{name}</h3>
        {description ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
      </header>
      <div className="p-4 max-w-2xl bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900">
        {children}
      </div>
    </section>
  );
}

export function ExtensionDesigns() {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {extensionPackageTitle} — Progress &amp; Results
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Each component is rendered in its main display state with hard-coded sample data.
        </p>
      </header>

      <DesignSection
        name="StageProgressArea"
        description="Base segmented progress bar with a static message subline."
      >
        <StageProgressArea
          step={2}
          numSteps={3}
          message="Submission received and queued for processing…"
        />
      </DesignSection>

      <DesignSection
        name="SimpleErrorArea"
        description="Error alert plus segmented bar: earlier stages green, failed segment red."
      >
        <SimpleErrorArea
          numSteps={3}
          segmentTones={['complete', 'error', 'muted']}
          failedStageTitle="Processing"
          error="The remote service responded with HTTP 502 (Bad Gateway)."
        />
      </DesignSection>

      <DesignSection
        name="SubmittingProgressArea"
        description="Stage 1 — uploading the work to the text integrity service."
      >
        <SubmittingProgressArea />
      </DesignSection>

      <DesignSection
        name="SubmissionCompleteProgressArea"
        description="Submission accepted — waiting for processing to start."
      >
        <SubmissionCompleteProgressArea />
      </DesignSection>

      <DesignSection
        name="ProcessingProgressArea"
        description="Stage 2 — service is analysing the submission."
      >
        <ProcessingProgressArea />
      </DesignSection>

      <DesignSection
        name="TextIntegrityResultsArea"
        description="Final results with similarity scores, top matches and report actions."
      >
        <TextIntegrityResultsArea metadata={SAMPLE_RESULTS_DATA} />
      </DesignSection>
    </div>
  );
}

export default ExtensionDesigns;
