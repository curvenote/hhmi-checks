/**
 * Payload type for the submit-proofig task (decoded from Pub/Sub message.data).
 * Matches what the PROOFIG_SUBMIT job handler publishes.
 */

export type FileEntry = {
  signedUrl?: string;
  name?: string;
  path?: string;
  type?: string;
  [key: string]: unknown;
};

export type WorkVersionMetadataPayload = {
  version?: number;
  files?: Record<string, FileEntry>;
  [key: string]: unknown;
};

export type WorkVersionPayload = {
  id: string;
  title: string;
  authors: string[];
  metadata: WorkVersionMetadataPayload | null;
  [key: string]: unknown;
};

export type ProofigSubmitPayload = {
  taskId: string;
  workVersion: WorkVersionPayload;
  submit_req_id: string;
  notify_url: string;
};

function hasPdfFile(files: Record<string, FileEntry> | undefined): FileEntry | null {
  if (!files || typeof files !== 'object') return null;
  const entries = Object.values(files);
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const type = entry.type?.toLowerCase?.();
    const name = (entry.name ?? entry.path ?? '')?.toLowerCase?.();
    const isPdf =
      type === 'application/pdf' ||
      (typeof name === 'string' && (name.endsWith('.pdf') || name === 'pdf'));
    if (isPdf && entry.signedUrl) return entry;
  }
  return null;
}

/**
 * Validates payload: required fields present, workVersion.metadata.files has at least one PDF with signedUrl.
 */
export function validatePayload(payload: unknown): payload is ProofigSubmitPayload {
  if (payload === null || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  if (
    typeof p.taskId !== 'string' ||
    typeof p.submit_req_id !== 'string' ||
    typeof p.notify_url !== 'string'
  )
    return false;
  const wv = p.workVersion;
  if (!wv || typeof wv !== 'object') return false;
  const meta = (wv as WorkVersionPayload).metadata;
  if (!meta || typeof meta !== 'object') return false;
  const pdfFile = hasPdfFile(meta.files);
  return pdfFile !== null;
}

/**
 * Returns the first PDF file entry from workVersion.metadata.files (with signedUrl).
 * Call after validatePayload.
 */
export function getPdfFile(payload: ProofigSubmitPayload): FileEntry {
  const files = payload.workVersion.metadata?.files;
  const entry = hasPdfFile(files);
  if (!entry) throw new Error('No PDF file with signedUrl in workVersion.metadata.files');
  return entry;
}
