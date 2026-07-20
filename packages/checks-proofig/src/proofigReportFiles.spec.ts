// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { KnownState, MINIMAL_PROOFIG_SERVICE_DATA, type ProofigDataSchema } from './schema.js';
import {
  buildProofigReportFileEntry,
  clearStoredProofigReport,
  getProofigPdfReadiness,
  hasStoredProofigReport,
  replaceGeneratedProofigReport,
  shouldPersistProofigReport,
  withoutGeneratedProofigReportFiles,
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

const GENERATED_PATH = 'cdn/generated/run/proofig-report.pdf';

function storedFileEntry(path = GENERATED_PATH) {
  return {
    name: 'proofig-report.pdf',
    path,
    size: 10,
    type: 'application/pdf',
    md5: 'abc',
    slot: 'generated' as const,
    uploadDate: '2025-01-01T00:00:00Z',
    label: 'Proofig report',
  };
}

describe('getProofigPdfReadiness', () => {
  it('returns not-final before the report stage', () => {
    expect(getProofigPdfReadiness(MINIMAL_PROOFIG_SERVICE_DATA)).toBe('not-final');
    expect(getProofigPdfReadiness(undefined)).toBe('not-final');
  });

  it('returns no-url when final but report URL is missing', () => {
    expect(
      getProofigPdfReadiness(
        finalReportData({
          reportUrl: undefined,
          summary: {
            state: KnownState.ReportClean,
            receivedAt: '2025-01-01T00:00:00Z',
          },
        }),
      ),
    ).toBe('no-url');
  });

  it('returns pending when final with URL but nothing stored yet', () => {
    expect(getProofigPdfReadiness(finalReportData())).toBe('pending');
  });

  it('returns stored-current when a PDF is stored for the current report id', () => {
    const stored = finalReportData({
      proofigReportStored: true,
      storedReportId: 'report-1',
      files: { [GENERATED_PATH]: storedFileEntry() },
    });
    expect(getProofigPdfReadiness(stored)).toBe('stored-current');
    expect(hasStoredProofigReport(stored)).toBe(true);
  });

  it('returns stored-stale when stored PDF is for a different report id', () => {
    const stale = finalReportData({
      reportId: 'report-2',
      proofigReportStored: true,
      storedReportId: 'report-1',
      files: { [GENERATED_PATH]: storedFileEntry() },
    });
    expect(getProofigPdfReadiness(stale)).toBe('stored-stale');
    expect(hasStoredProofigReport(stale)).toBe(false);
    expect(shouldPersistProofigReport(stale)).toBe(true);
  });
});

describe('withoutGeneratedProofigReportFiles / replaceGeneratedProofigReport', () => {
  it('removes only generated-slot entries and drops empty files maps', () => {
    const files = {
      [GENERATED_PATH]: storedFileEntry(),
      'cdn/other.pdf': {
        ...storedFileEntry('cdn/other.pdf'),
        slot: 'upload' as const,
        name: 'other.pdf',
      },
    };
    const next = withoutGeneratedProofigReportFiles(files);
    expect(next).toEqual({
      'cdn/other.pdf': expect.objectContaining({ path: 'cdn/other.pdf', slot: 'upload' }),
    });
    expect(
      withoutGeneratedProofigReportFiles({ [GENERATED_PATH]: storedFileEntry() }),
    ).toBeUndefined();
  });

  it('replaces any prior generated-slot file and marks the report stored', () => {
    const prior = finalReportData({
      proofigReportStored: true,
      storedReportId: 'report-old',
      files: {
        'cdn/old/proofig-report.pdf': storedFileEntry('cdn/old/proofig-report.pdf'),
        'cdn/other.pdf': {
          ...storedFileEntry('cdn/other.pdf'),
          slot: 'upload' as const,
          name: 'other.pdf',
        },
      },
    });
    const entry = buildProofigReportFileEntry(GENERATED_PATH, 20, 'def', '2025-02-01T00:00:00Z');
    const next = replaceGeneratedProofigReport(prior, entry, 'report-1');

    expect(next.proofigReportStored).toBe(true);
    expect(next.storedReportId).toBe('report-1');
    expect(next.files?.[GENERATED_PATH]).toEqual(entry);
    expect(next.files?.['cdn/old/proofig-report.pdf']).toBeUndefined();
    expect(next.files?.['cdn/other.pdf']).toBeDefined();
  });

  it('falls back to serviceData.reportId when storedReportId arg is omitted', () => {
    const entry = buildProofigReportFileEntry(GENERATED_PATH, 20, 'def', '2025-02-01T00:00:00Z');
    const next = replaceGeneratedProofigReport(
      finalReportData({ reportId: 'report-1' }),
      entry,
      undefined,
    );
    expect(next.storedReportId).toBe('report-1');
  });
});

describe('clearStoredProofigReport', () => {
  it('clears stored flags and generated-slot files so persist can run again', () => {
    const stored = finalReportData({
      proofigReportStored: true,
      storedReportId: 'report-1',
      files: {
        [GENERATED_PATH]: storedFileEntry(),
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
    expect(getProofigPdfReadiness(cleared)).toBe('pending');
  });
});
