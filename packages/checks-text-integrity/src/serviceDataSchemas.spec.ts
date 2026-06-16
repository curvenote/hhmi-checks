// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import {
  type LinearStage,
  type LinearStageStatus,
  type TextIntegrityDataSchema,
  isAwaitingInitialTextIntegrityStages,
  isWaitingForPdfReport,
  shouldPollTextIntegrityChecks,
} from './serviceDataSchemas.js';

const TS = '2025-01-01T00:00:00Z';

function stage(status: LinearStageStatus): LinearStage {
  return { status, history: [], timestamp: TS };
}

function dataWithReportStatus(
  reportStatus: LinearStageStatus | undefined,
  processingStatus: LinearStageStatus = 'completed',
): TextIntegrityDataSchema {
  return {
    stages: {
      submission: stage('completed'),
      processing: stage(processingStatus),
      ...(reportStatus == null ? {} : { reportGeneration: stage(reportStatus) }),
    },
  };
}

describe('isWaitingForPdfReport', () => {
  it.each<LinearStageStatus>(['pending', 'processing'])(
    'returns true when reportGeneration.status is %s',
    (status) => {
      expect(isWaitingForPdfReport(dataWithReportStatus(status))).toBe(true);
    },
  );

  it.each<LinearStageStatus>(['completed', 'notify-skipped', 'error'])(
    'returns false when reportGeneration.status is %s',
    (status) => {
      expect(isWaitingForPdfReport(dataWithReportStatus(status))).toBe(false);
    },
  );

  it('returns false when metadata, stages, or reportGeneration are missing', () => {
    expect(isWaitingForPdfReport(undefined)).toBe(false);
    expect(
      isWaitingForPdfReport({
        stages: {
          submission: stage('completed'),
          processing: stage('completed'),
        },
      }),
    ).toBe(false);
  });
});

describe('shouldPollTextIntegrityChecks', () => {
  it('polls while awaiting initial stages after dispatch (poll-before-run window)', () => {
    expect(shouldPollTextIntegrityChecks(undefined, 'run-1')).toBe(true);
    expect(isAwaitingInitialTextIntegrityStages(undefined, 'run-1')).toBe(true);
  });

  it('does not poll without a check run id or stamped stages', () => {
    expect(shouldPollTextIntegrityChecks(undefined, undefined)).toBe(false);
    expect(shouldPollTextIntegrityChecks(undefined, '   ')).toBe(false);
  });

  it('polls while pipeline stages are in progress before results are available', () => {
    const inProgress: TextIntegrityDataSchema = {
      stages: {
        submission: stage('completed'),
        processing: stage('processing'),
        reportGeneration: stage('pending'),
      },
    };
    expect(shouldPollTextIntegrityChecks(inProgress, 'run-1')).toBe(true);
  });

  it('continues polling after results are shown while the PDF report is still generating', () => {
    const waitingForPdf = dataWithReportStatus('processing');
    expect(shouldPollTextIntegrityChecks(waitingForPdf, 'run-1')).toBe(true);

    const pendingPdf = dataWithReportStatus('pending');
    expect(shouldPollTextIntegrityChecks(pendingPdf, 'run-1')).toBe(true);
  });

  it('stops polling when processing and PDF generation are complete', () => {
    const done = dataWithReportStatus('completed');
    expect(shouldPollTextIntegrityChecks(done, 'run-1')).toBe(false);
  });

  it('stops polling when report generation errors even though results can be shown', () => {
    const errored = dataWithReportStatus('error');
    expect(shouldPollTextIntegrityChecks(errored, 'run-1')).toBe(false);
  });
});
