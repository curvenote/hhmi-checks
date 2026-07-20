import type { FileMetadataSectionItem } from '@curvenote/scms-core';
import { KnownState, type ProofigDataSchema } from './schema.js';

export const PROOFIG_REPORT_GENERATED_SLOT = 'generated';
export const PROOFIG_REPORT_FILENAME = 'proofig-report.pdf';

/**
 * Absolute storage object key for the persisted Proofig report PDF for a check run
 * (`{cdn_key}/generated/{checkRunId}/proofig-report.pdf`). This matches the path the
 * Cloud Run worker reports back after upload and is what the download route reads.
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
 * True when we should (auto) persist a report PDF: at a final report stage, with a report URL,
 * and either nothing stored yet or the stored PDF is for a different report id.
 */
export function shouldPersistProofigReport(serviceData: ProofigDataSchema | undefined): boolean {
  if (!serviceData) return false;
  if (!isProofigAtFinalReportStage(serviceData)) return false;
  const reportUrl = serviceData.reportUrl?.trim() || serviceData.summary?.reportUrl?.trim();
  if (!reportUrl) return false;
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
