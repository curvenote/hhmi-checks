import { WebhookEvent, type TextIntegrityDataSchema } from '../schema.js';

export const TWO_MIN_AGO_ISO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
export const FIVE_MIN_AGO_ISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
export const THIRTY_SEC_AGO_ISO = new Date(Date.now() - 30 * 1000).toISOString();

const BASE_MANIFEST = {
  name: 'demo-text-integrity',
  title: 'Demo Text Integrity Service',
  logo: '',
  version: '1.0.0',
} as const;

const COMPLETED_STAGES = {
  submission: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: FIVE_MIN_AGO_ISO }],
    timestamp: FIVE_MIN_AGO_ISO,
  },
  processing: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: FIVE_MIN_AGO_ISO }],
    timestamp: TWO_MIN_AGO_ISO,
  },
  reportGeneration: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: TWO_MIN_AGO_ISO }],
    timestamp: THIRTY_SEC_AGO_ISO,
  },
};

function makeResultsData(overallMatchPercentage: number): TextIntegrityDataSchema {
  return {
    externalId: `demo-external-${overallMatchPercentage}`,
    submissionId: 'demo-submission-456',
    externalRef: 'demo-provider-789',
    reportPdfId: 'demo-pdf-001',
    manifest: BASE_MANIFEST,
    stages: COMPLETED_STAGES,
    latest: {
      event: WebhookEvent.ReportGenerationComplete,
      receivedAt: THIRTY_SEC_AGO_ISO,
      overallMatchPercentage,
      reportPdfId: 'demo-pdf-001',
    },
    summaryReport: {
      submissionId: 'demo-submission-456',
      overallMatchPercentage,
      internetMatchPercentage: Math.round(overallMatchPercentage * 0.55),
      publicationMatchPercentage: Math.round(overallMatchPercentage * 0.3),
      submittedWorksMatchPercentage: Math.round(overallMatchPercentage * 0.15),
      status: 'COMPLETE',
      timeRequested: FIVE_MIN_AGO_ISO,
      timeGenerated: THIRTY_SEC_AGO_ISO,
      topSourceLargestMatchedWordCount: 142,
      topMatches: [],
    },
  };
}

export const SAMPLE_RESULTS_DATA = makeResultsData(32);

export const SAMPLE_RESULTS_0_PERCENT = makeResultsData(0);
export const SAMPLE_RESULTS_5_PERCENT = makeResultsData(5);
export const SAMPLE_RESULTS_32_PERCENT = makeResultsData(32);
export const SAMPLE_RESULTS_55_PERCENT = makeResultsData(55);
export const SAMPLE_RESULTS_80_PERCENT = makeResultsData(80);

export const SAMPLE_NO_STAGES: TextIntegrityDataSchema | undefined = undefined;

export const SAMPLE_IN_PROGRESS: TextIntegrityDataSchema = {
  externalId: 'demo-in-progress',
  submissionId: 'demo-submission-in-progress',
  manifest: BASE_MANIFEST,
  stages: {
    submission: {
      status: 'completed',
      history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: FIVE_MIN_AGO_ISO,
    },
    processing: {
      status: 'processing',
      history: [{ status: 'pending', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: TWO_MIN_AGO_ISO,
    },
  },
};

export const SAMPLE_STAGE_ERROR: TextIntegrityDataSchema = {
  externalId: 'demo-error',
  submissionId: 'demo-submission-error',
  manifest: BASE_MANIFEST,
  stages: {
    submission: {
      status: 'completed',
      history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: FIVE_MIN_AGO_ISO,
    },
    processing: {
      status: 'error',
      history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
      timestamp: TWO_MIN_AGO_ISO,
      error: 'The remote service responded with HTTP 502 (Bad Gateway).',
    },
  },
};
