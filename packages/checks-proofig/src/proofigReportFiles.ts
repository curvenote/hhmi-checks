import type { FileMetadataSectionItem } from '@curvenote/scms-core';
import { KnownState, type ProofigDataSchema } from './schema.js';

export const PROOFIG_REPORT_GENERATED_SLOT = 'generated';
export const PROOFIG_REPORT_FILENAME = 'proofig-report.pdf';

/** UI / enqueue readiness for the persisted Proofig report PDF. */
export type ProofigPdfReadiness =
  | 'not-final'
  | 'no-url'
  | 'pending'
  | 'stored-current'
  | 'stored-stale';

/**
 * Absolute storage object key for the persisted Proofig report PDF for a check run
 * (`{cdn_key}/generated/{checkRunId}/proofig-report.pdf`).
 *
 * Contract: the Cloud Run worker passes a *relative* path to `uploadSingleFileToCdn`,
 * which returns this absolute key; the pdf-stored hook and download loader both expect
 * that absolute form (see scms-tasks `uploadSingleFileToCdn` return value).
 */
export function proofigReportStoragePath(cdnKey: string, checkRunId: string): string {
  const prefix = cdnKey.replace(/\/$/, '');
  return `${prefix}/generated/${checkRunId}/${PROOFIG_REPORT_FILENAME}`;
}

/** The report revision key used for idempotency (Proofig report id). */
export function currentProofigReportId(
  serviceData: ProofigDataSchema | undefined,
): string | undefined {
  const id = serviceData?.reportId?.trim();
  return id ? id : undefined;
}

/** File entry (keyed by storage path) for the stored Proofig report PDF, if present. */
export function getStoredProofigReportFile(
  serviceData: ProofigDataSchema | undefined,
): FileMetadataSectionItem | undefined {
  const files = serviceData?.files;
  if (!files || typeof files !== 'object') return undefined;
  for (const entry of Object.values(files)) {
    if (entry?.slot === PROOFIG_REPORT_GENERATED_SLOT) return entry;
  }
  return undefined;
}

/**
 * True when Proofig has reached a final report outcome (Clean or Flagged), either via the
 * resultsReview stage outcome or the summary state. This is the earliest point at which a
 * report PDF can be generated.
 */
export function isProofigAtFinalReportStage(serviceData: ProofigDataSchema | undefined): boolean {
  if (!serviceData || serviceData.deleted) return false;
  const rr = serviceData.stages?.resultsReview;
  if (
    (rr?.status === 'completed' || rr?.status === 'not-requested') &&
    (rr.outcome === 'clean' || rr.outcome === 'flagged')
  ) {
    return true;
  }
  const state = serviceData.summary?.state;
  return state === KnownState.ReportClean || state === KnownState.ReportFlagged;
}

function proofigReportUrl(serviceData: ProofigDataSchema | undefined): string | undefined {
  const url = serviceData?.reportUrl?.trim() || serviceData?.summary?.reportUrl?.trim();
  return url ? url : undefined;
}

/** True when a Proofig report PDF is stored for the current report id. */
export function hasStoredProofigReport(serviceData: ProofigDataSchema | undefined): boolean {
  if (serviceData?.proofigReportStored !== true) return false;
  if (!getStoredProofigReportFile(serviceData)?.path) return false;
  const reportId = currentProofigReportId(serviceData);
  // If we know the current report id, require the stored id to match it.
  if (reportId) return serviceData.storedReportId === reportId;
  return true;
}

/**
 * Single readiness classifier for UI, download, and enqueue decisions.
 *
 * - `not-final` — report stage not reached
 * - `no-url` — final but no report URL to render from
 * - `pending` — final with URL, PDF not yet stored for current report
 * - `stored-current` — PDF stored for the current report id
 * - `stored-stale` — PDF metadata present but for a different report id
 */
export function getProofigPdfReadiness(
  serviceData: ProofigDataSchema | undefined,
): ProofigPdfReadiness {
  if (!isProofigAtFinalReportStage(serviceData)) return 'not-final';
  if (!proofigReportUrl(serviceData)) return 'no-url';
  if (hasStoredProofigReport(serviceData)) return 'stored-current';

  const reportId = currentProofigReportId(serviceData);
  if (
    serviceData?.proofigReportStored === true &&
    reportId &&
    serviceData.storedReportId !== reportId
  ) {
    return 'stored-stale';
  }
  return 'pending';
}

/** Drop all generated-slot file entries; returns undefined when the map is empty. */
export function withoutGeneratedProofigReportFiles(
  files: ProofigDataSchema['files'],
): ProofigDataSchema['files'] {
  if (!files || typeof files !== 'object') return undefined;
  const nextFiles = { ...files };
  for (const key of Object.keys(nextFiles)) {
    if (nextFiles[key]?.slot === PROOFIG_REPORT_GENERATED_SLOT) {
      delete nextFiles[key];
    }
  }
  return Object.keys(nextFiles).length > 0 ? nextFiles : undefined;
}

/**
 * Replace any prior generated-slot PDF entry and mark the report as stored.
 * When `storedReportId` is omitted, falls back to `serviceData.reportId` (same as the
 * pdf-stored hook).
 */
export function replaceGeneratedProofigReport(
  serviceData: ProofigDataSchema,
  fileEntry: FileMetadataSectionItem,
  storedReportId: string | undefined,
): ProofigDataSchema {
  const nextFiles = { ...(withoutGeneratedProofigReportFiles(serviceData.files) ?? {}) };
  nextFiles[fileEntry.path] = fileEntry;
  return {
    ...serviceData,
    files: nextFiles,
    proofigReportStored: true,
    storedReportId: storedReportId ?? serviceData.reportId,
  };
}

/**
 * Clear generated-slot file metadata and stored-report flags so `shouldPersistProofigReport`
 * can enqueue again (e.g. after the CDN object was deleted but metadata remained).
 */
export function clearStoredProofigReport(serviceData: ProofigDataSchema): ProofigDataSchema {
  return {
    ...serviceData,
    files: withoutGeneratedProofigReportFiles(serviceData.files),
    proofigReportStored: false,
    storedReportId: undefined,
  };
}

/**
 * True when we should (auto) persist a report PDF: at a final report stage, with a report URL,
 * and either nothing stored yet or the stored PDF is for a different report id.
 *
 * Kept independent of `getProofigPdfReadiness` so a stored flag with a matching report id
 * (even without a file entry) still skips auto-persist — matching prior enqueue behavior.
 */
export function shouldPersistProofigReport(serviceData: ProofigDataSchema | undefined): boolean {
  if (!serviceData) return false;
  if (!isProofigAtFinalReportStage(serviceData)) return false;
  if (!proofigReportUrl(serviceData)) return false;
  if (!serviceData.proofigReportStored) return true;
  const reportId = currentProofigReportId(serviceData);
  return Boolean(reportId && serviceData.storedReportId !== reportId);
}

/** Build the file metadata entry stored on check run `serviceData.files`. */
export function buildProofigReportFileEntry(
  storagePath: string,
  size: number,
  md5: string,
  uploadDate: string,
): FileMetadataSectionItem {
  return {
    name: PROOFIG_REPORT_FILENAME,
    path: storagePath,
    size,
    type: 'application/pdf',
    md5,
    slot: PROOFIG_REPORT_GENERATED_SLOT,
    uploadDate,
    label: 'Proofig report',
  };
}
