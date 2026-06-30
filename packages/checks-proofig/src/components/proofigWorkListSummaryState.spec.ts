// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { KnownState, type ProofigDataSchema } from '../schema.js';
import {
  getProofigWorkListCompactSummaryState,
  getProofigWorkListSummaryState,
} from './proofigWorkListSummaryState.js';

const receivedAt = '2026-01-01T00:00:00.000Z';

describe('getProofigWorkListSummaryState', () => {
  it('shows awaiting review while Proofig has unreviewed matches and no confirmed problems', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.AwaitingReview,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 2,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'requested',
          outcome: 'pending',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: '2/23 AWAITING REVIEW',
      underlineClassName: 'bg-warning',
    });
  });

  it('shows awaiting review even when the results review outcome is not set yet', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.AwaitingReview,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 2,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'requested',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: '2/23 AWAITING REVIEW',
      underlineClassName: 'bg-warning',
    });
  });

  it('shows all clear for a final report with no matches or confirmed problems', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.ReportClean,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 0,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'clean',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: 'ALL CLEAR',
      underlineClassName: 'bg-success',
    });
  });

  it('shows all clear only after review completes with no confirmed problems', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.ReportClean,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 2,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'clean',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: 'ALL CLEAR',
      underlineClassName: 'bg-success',
    });
  });

  it('shows the problem count label after review completes with confirmed problems', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.ReportFlagged,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 4,
        matchesReport: 2,
        inspectsReport: 1,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'flagged',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: '3 PROBLEMS',
      underlineClassName: 'bg-destructive',
    });
  });

  it('uses the singular problem label after review completes with one confirmed problem', () => {
    const state = getProofigWorkListSummaryState({
      summary: {
        state: KnownState.ReportFlagged,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 1,
        matchesReport: 1,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'flagged',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: '1 PROBLEM',
      underlineClassName: 'bg-destructive',
    });
  });

  it('falls back to the current in-progress stage label before a final report', () => {
    const state = getProofigWorkListSummaryState({
      stages: {
        initialPost: {
          status: 'processing',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      label: 'UPLOADING TO PROOFIG',
      underlineClassName: 'bg-primary',
    });
  });
});

describe('getProofigWorkListCompactSummaryState', () => {
  it('uses an eye icon for sub-image review based on the current stage', () => {
    const state = getProofigWorkListCompactSummaryState({
      stages: {
        initialPost: { status: 'completed', history: [], timestamp: receivedAt },
        subimageDetection: { status: 'completed', history: [], timestamp: receivedAt },
        subimageSelection: { status: 'pending', history: [], timestamp: receivedAt },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'icon',
      icon: 'eye',
      ariaLabel: 'READY FOR SUB-IMAGE REVIEW',
      underlineClassName: 'bg-warning',
    });
  });

  it('uses an hourglass icon for in-progress states', () => {
    const state = getProofigWorkListCompactSummaryState({
      stages: {
        initialPost: { status: 'processing', history: [], timestamp: receivedAt },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'icon',
      icon: 'hourglass',
      ariaLabel: 'UPLOADING TO PROOFIG',
      underlineClassName: 'bg-primary',
    });
  });

  it('uses a ratio for awaiting review when counts are available', () => {
    const state = getProofigWorkListCompactSummaryState({
      summary: {
        state: KnownState.AwaitingReview,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 2,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'requested',
          outcome: 'pending',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'text',
      label: '2/23',
      underlineClassName: 'bg-warning',
    });
  });

  it('uses an hourglass for awaiting review when counts are not available', () => {
    const state = getProofigWorkListCompactSummaryState({
      summary: {
        state: KnownState.AwaitingReview,
        receivedAt,
      },
      stages: {
        resultsReview: {
          status: 'requested',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'icon',
      icon: 'hourglass',
      ariaLabel: 'AWAITING REVIEW',
      underlineClassName: 'bg-warning',
    });
  });

  it('uses only the numeric problem count for problem states', () => {
    const state = getProofigWorkListCompactSummaryState({
      summary: {
        state: KnownState.ReportFlagged,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 4,
        matchesReport: 2,
        inspectsReport: 1,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'flagged',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'text',
      label: '3',
      underlineClassName: 'bg-destructive',
    });
  });

  it('keeps the label for compact all-clear states', () => {
    const state = getProofigWorkListCompactSummaryState({
      summary: {
        state: KnownState.ReportClean,
        receivedAt,
        subimagesTotal: 23,
        matchesReview: 0,
        matchesReport: 0,
        inspectsReport: 0,
      },
      stages: {
        resultsReview: {
          status: 'completed',
          outcome: 'clean',
          history: [],
          timestamp: receivedAt,
        },
      },
    } as unknown as ProofigDataSchema);

    expect(state).toEqual({
      kind: 'text',
      label: 'ALL CLEAR',
      underlineClassName: 'bg-success',
    });
  });
});
