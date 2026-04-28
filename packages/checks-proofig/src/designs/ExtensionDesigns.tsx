import type { ReactNode } from 'react';
import { extensionPackageTitle } from '../meta.js';
import { KnownState, type ProofigDataSchema, type ProofigStage } from '../schema.js';
import { DefaultArea } from '../components/progress/DefaultArea.js';
import { InitialPostProgressArea } from '../components/progress/InitialPostProgressArea.js';
import { IntegrityDetectionProgressArea } from '../components/progress/IntegrityDetectionProgressArea.js';
import { PendingProgressArea } from '../components/progress/PendingProgressArea.js';
import { SimpleErrorArea } from '../components/progress/SimpleErrorArea.js';
import { StageProgressArea } from '../components/progress/StageProgressArea.js';
import { SubimageApprovalProgressArea } from '../components/progress/SubimageApprovalProgressArea.js';
import { SubimageDetectionProgressArea } from '../components/progress/SubimageDetectionProgressArea.js';
import { ResultsSummaryArea } from '../components/ResultsSummaryArea.js';

const NOW_ISO = new Date().toISOString();
const TWO_MIN_AGO_ISO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const FIVE_MIN_AGO_ISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const THIRTY_SEC_AGO_ISO = new Date(Date.now() - 30 * 1000).toISOString();

const SAMPLE_PENDING_STAGE: ProofigStage = {
  status: 'pending',
  history: [],
  timestamp: NOW_ISO,
};

const SAMPLE_PROCESSING_STAGE: ProofigStage = {
  status: 'processing',
  history: [{ status: 'pending', timestamp: FIVE_MIN_AGO_ISO }],
  timestamp: TWO_MIN_AGO_ISO,
};

const SAMPLE_COMPLETED_STAGE: ProofigStage = {
  status: 'completed',
  history: [
    { status: 'pending', timestamp: FIVE_MIN_AGO_ISO },
    { status: 'processing', timestamp: TWO_MIN_AGO_ISO },
  ],
  timestamp: THIRTY_SEC_AGO_ISO,
};

const SAMPLE_ERROR_STAGE: ProofigStage = {
  status: 'error',
  history: [{ status: 'processing', timestamp: FIVE_MIN_AGO_ISO }],
  timestamp: TWO_MIN_AGO_ISO,
  error: 'The remote service responded with HTTP 502 (Bad Gateway).',
};

const SAMPLE_REPORT_URL = 'https://example.com/proofig/report/demo';

/** Same path as `PROOFIG_CHECKS_ACTION_PATH` in client (not imported here to avoid a cycle with `client.ts`). */
const DESIGN_REMOTE_STATUS_ACTION_PATH = '/app/extensions/proofig/actions';
const DESIGN_WORK_VERSION_ID = '00000000-0000-4000-8000-000000000001';
const DESIGN_CHECK_RUN_ID = '00000000-0000-4000-8000-000000000002';

/** Placeholder IDs and action path so Refresh / report flows render on the design page (POST will not succeed). */
const designProofigRefreshProps = {
  remoteStatusActionPath: DESIGN_REMOTE_STATUS_ACTION_PATH,
  workVersionId: DESIGN_WORK_VERSION_ID,
  checkRunId: DESIGN_CHECK_RUN_ID,
} as const;

const COMPLETED_LINEAR_STAGES = {
  initialPost: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: FIVE_MIN_AGO_ISO }],
    timestamp: FIVE_MIN_AGO_ISO,
  },
  subimageDetection: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: FIVE_MIN_AGO_ISO }],
    timestamp: TWO_MIN_AGO_ISO,
  },
  subimageSelection: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: TWO_MIN_AGO_ISO }],
    timestamp: TWO_MIN_AGO_ISO,
  },
  integrityDetection: {
    status: 'completed' as const,
    history: [{ status: 'processing' as const, timestamp: TWO_MIN_AGO_ISO }],
    timestamp: THIRTY_SEC_AGO_ISO,
  },
};

const SAMPLE_RESULTS_DATA_FLAGGED: ProofigDataSchema = {
  reportId: 'demo-report-flagged',
  reportUrl: SAMPLE_REPORT_URL,
  deleted: false,
  summary: {
    state: KnownState.ReportFlagged,
    subimagesTotal: 24,
    matchesReview: 6,
    matchesReport: 3,
    inspectsReport: 0,
    reportUrl: SAMPLE_REPORT_URL,
    receivedAt: THIRTY_SEC_AGO_ISO,
  },
  stages: {
    ...COMPLETED_LINEAR_STAGES,
    resultsReview: {
      status: 'completed',
      outcome: 'flagged',
      history: [
        { status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO },
        { status: 'completed', outcome: 'flagged', timestamp: THIRTY_SEC_AGO_ISO },
      ],
      timestamp: THIRTY_SEC_AGO_ISO,
    },
  },
};

const SAMPLE_RESULTS_DATA_FLAGGED_WITH_MANUAL: ProofigDataSchema = {
  reportId: 'demo-report-flagged',
  reportUrl: SAMPLE_REPORT_URL,
  deleted: false,
  summary: {
    state: KnownState.ReportFlagged,
    subimagesTotal: 24,
    matchesReview: 6,
    matchesReport: 2,
    inspectsReport: 1,
    reportUrl: SAMPLE_REPORT_URL,
    receivedAt: THIRTY_SEC_AGO_ISO,
  },
  stages: {
    ...COMPLETED_LINEAR_STAGES,
    resultsReview: {
      status: 'completed',
      outcome: 'flagged',
      history: [
        { status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO },
        { status: 'completed', outcome: 'flagged', timestamp: THIRTY_SEC_AGO_ISO },
      ],
      timestamp: THIRTY_SEC_AGO_ISO,
    },
  },
};

const SAMPLE_RESULTS_DATA_FLAGGED_NO_PROBLEMS: ProofigDataSchema = {
  reportId: 'demo-report-flagged',
  reportUrl: SAMPLE_REPORT_URL,
  deleted: false,
  summary: {
    state: KnownState.ReportFlagged,
    subimagesTotal: 24,
    matchesReview: 6,
    matchesReport: 0,
    inspectsReport: 0,
    reportUrl: SAMPLE_REPORT_URL,
    receivedAt: THIRTY_SEC_AGO_ISO,
  },
  stages: {
    ...COMPLETED_LINEAR_STAGES,
    resultsReview: {
      status: 'completed',
      outcome: 'flagged',
      history: [
        { status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO },
        { status: 'completed', outcome: 'flagged', timestamp: THIRTY_SEC_AGO_ISO },
      ],
      timestamp: THIRTY_SEC_AGO_ISO,
    },
  },
};

function makeAllClearResultsData({
  reportId,
  subimagesTotal,
}: {
  reportId: string;
  subimagesTotal: number;
}): ProofigDataSchema {
  return {
    reportId,
    reportUrl: SAMPLE_REPORT_URL,
    deleted: false,
    summary: {
      state: KnownState.ReportClean,
      subimagesTotal,
      matchesReview: 0,
      matchesReport: 0,
      inspectsReport: 0,
      reportUrl: SAMPLE_REPORT_URL,
      receivedAt: THIRTY_SEC_AGO_ISO,
    },
    stages: {
      ...COMPLETED_LINEAR_STAGES,
      resultsReview: {
        status: 'completed',
        outcome: 'clean',
        history: [
          { status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO },
          { status: 'completed', outcome: 'clean', timestamp: THIRTY_SEC_AGO_ISO },
        ],
        timestamp: THIRTY_SEC_AGO_ISO,
      },
    },
  };
}

const SAMPLE_RESULTS_DATA_ALL_CLEAR_2 = makeAllClearResultsData({
  reportId: 'demo-report-clear-2',
  subimagesTotal: 2,
});

const SAMPLE_RESULTS_DATA_ALL_CLEAR_11 = makeAllClearResultsData({
  reportId: 'demo-report-clear-11',
  subimagesTotal: 11,
});

const SAMPLE_RESULTS_DATA_AWAITING_REVIEW: ProofigDataSchema = {
  reportId: 'demo-report-awaiting',
  reportUrl: SAMPLE_REPORT_URL,
  deleted: false,
  summary: {
    state: KnownState.AwaitingReview,
    subimagesTotal: 24,
    matchesReview: 3,
    matchesReport: 0,
    inspectsReport: 0,
    reportUrl: SAMPLE_REPORT_URL,
    receivedAt: THIRTY_SEC_AGO_ISO,
  },
  stages: {
    ...COMPLETED_LINEAR_STAGES,
    resultsReview: {
      status: 'requested',
      outcome: 'pending',
      history: [{ status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO }],
      timestamp: TWO_MIN_AGO_ISO,
    },
  },
};

/** Last-known summary after Proofig sends notify state Deleted — report link and refresh are hidden. */
const SAMPLE_RESULTS_DATA_DELETED: ProofigDataSchema = {
  reportId: 'demo-report-deleted',
  reportUrl: SAMPLE_REPORT_URL,
  deleted: true,
  summary: {
    state: KnownState.Deleted,
    subimagesTotal: 24,
    matchesReview: 0,
    matchesReport: 3,
    inspectsReport: 1,
    reportUrl: SAMPLE_REPORT_URL,
    receivedAt: THIRTY_SEC_AGO_ISO,
  },
  stages: {
    ...COMPLETED_LINEAR_STAGES,
    resultsReview: {
      status: 'completed',
      outcome: 'flagged',
      history: [
        { status: 'requested', outcome: 'pending', timestamp: TWO_MIN_AGO_ISO },
        { status: 'completed', outcome: 'flagged', timestamp: THIRTY_SEC_AGO_ISO },
      ],
      timestamp: THIRTY_SEC_AGO_ISO,
    },
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
        description="Base segmented progress bar, used wihtin other components with an optional “started X ago” subline."
      >
        <StageProgressArea step={2} numSteps={4} stageStartedAt={TWO_MIN_AGO_ISO} />
      </DesignSection>

      <DesignSection
        name="SimpleErrorArea"
        description="Generic error alert plus error-state progress bar."
      >
        <SimpleErrorArea
          step={2}
          numSteps={4}
          message="Subimage detection failed."
          data={SAMPLE_ERROR_STAGE}
        />
      </DesignSection>

      <DesignSection
        name="PendingProgressArea"
        description="Initial pending state shown while the upload to Proofig is being prepared."
      >
        <PendingProgressArea data={SAMPLE_PENDING_STAGE} />
      </DesignSection>

      <DesignSection
        name="InitialPostProgressArea"
        description="Stage 1 — uploading the work to Proofig."
      >
        <InitialPostProgressArea data={SAMPLE_PROCESSING_STAGE} {...designProofigRefreshProps} />
      </DesignSection>

      <DesignSection
        name="SubimageDetectionProgressArea"
        description="Stage 2 — Proofig is identifying sub-images within figures."
      >
        <SubimageDetectionProgressArea
          data={SAMPLE_PROCESSING_STAGE}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="SubimageApprovalProgressArea"
        description="Stage 3 — author must approve the detected sub-images at Proofig."
      >
        <SubimageApprovalProgressArea
          data={SAMPLE_COMPLETED_STAGE}
          reportUrl={SAMPLE_REPORT_URL}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="IntegrityDetectionProgressArea"
        description="Stage 4 — Proofig is running image integrity checks."
      >
        <IntegrityDetectionProgressArea
          data={SAMPLE_PROCESSING_STAGE}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="DefaultArea"
        description="Fallback panel rendered when no other stage matches."
      >
        <DefaultArea />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — Awaiting review"
        description="Proofig has flagged matches for human review — review-state headline and review-coloured punchcard."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_AWAITING_REVIEW}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — All Clear (2 sub-images)"
        description="Report: Clean with a small number of sub-images and no flagged matches."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_ALL_CLEAR_2}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — All Clear (11 sub-images)"
        description="Report: Clean with a larger number of sub-images and no flagged matches."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_ALL_CLEAR_11}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — Flagged"
        description="Final results summary with confirmed problems and manual problems (Report: Flagged)."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_FLAGGED_WITH_MANUAL}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — Flagged"
        description="Final results summary with confirmed problems and no manual problems (Report: Flagged)."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_FLAGGED}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — Flagged"
        description="Final results summary that was flagged but no problems were confirmed (Report: Flagged)."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_FLAGGED_NO_PROBLEMS}
          {...designProofigRefreshProps}
        />
      </DesignSection>

      <DesignSection
        name="ResultsSummaryArea — Report deleted"
        description="After Proofig notifies Deleted: punchcard and headline still reflect last-known counts; actions row shows only “Report is no longer available on Proofig” (no review link, no refresh)."
      >
        <ResultsSummaryArea
          proofigData={SAMPLE_RESULTS_DATA_DELETED}
          {...designProofigRefreshProps}
        />
      </DesignSection>
    </div>
  );
}

export default ExtensionDesigns;
