// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { KnownState, MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from './schema.js';
import {
  clearStoredProofigReport,
  hasStoredProofigReport,
  shouldPersistProofigReport,
} from './proofigReportFiles.js';

function finalReportData(overrides: Partial<ProofigDataSchema> = {}): ProofigDataSchema {
  return {
    ...MINIMAL_PROOFIG_SERVICE_DATA,
    reportId: 'report-1',
    reportUrl: 'https://proofig.example/report/1',
    summary: {
      state: KnownState.ReportClean,
      receivedAt: '2025-01-01T00:00:00Z',
    },
    stages: {
      ...MINIMAL_PROOFIG_SERVICE_DATA.stages,
      resultsReview: {
        status: 'completed',
        history: [],
        timestamp: '2025-01-01T00:00:00Z',
        outcome: 'clean',
      },
    },
    ...overrides,
  };
}

describe('clearStoredProofigReport', () => {
  it('clears stored flags and generated-slot files so persist can run again', () => {
    const stored = finalReportData({
      proofigReportStored: true,
      storedReportId: 'report-1',
      files: {
        'cdn/generated/run/proofig-report.pdf': {
          name: 'proofig-report.pdf',
          path: 'cdn/generated/run/proofig-report.pdf',
          size: 10,
          type: 'application/pdf',
          md5: 'abc',
          slot: 'generated',
          uploadDate: '2025-01-01T00:00:00Z',
          label: 'Proofig report',
        },
      },
    });

    expect(hasStoredProofigReport(stored)).toBe(true);
    expect(shouldPersistProofigReport(stored)).toBe(false);

    const cleared = clearStoredProofigReport(stored);
    expect(hasStoredProofigReport(cleared)).toBe(false);
    expect(cleared.proofigReportStored).toBe(false);
    expect(cleared.storedReportId).toBeUndefined();
    expect(cleared.files).toBeUndefined();
    expect(shouldPersistProofigReport(cleared)).toBe(true);
  });
});
