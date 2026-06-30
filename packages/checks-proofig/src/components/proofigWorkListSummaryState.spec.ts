// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { KnownState, type ProofigDataSchema } from '../schema.js';
import { getProofigWorkListSummaryState } from './proofigWorkListSummaryState.js';

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
});
