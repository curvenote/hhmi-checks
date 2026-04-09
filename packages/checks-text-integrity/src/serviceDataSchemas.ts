import { z } from 'zod';
import {
  WebhookEventSchema,
  type SimilarityReport as SimilarityReportPayload,
} from './webhookSchemas.js';

// ---------------------------------------------------------------------------
// Linear stage tracking (mirroring proofig pattern)
// ---------------------------------------------------------------------------

export const LinearStageStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'notify-skipped',
  'error',
]);

export type LinearStageStatus = z.infer<typeof LinearStageStatusSchema>;

export const LinearStageSchema = z.object({
  status: LinearStageStatusSchema,
  history: z.array(
    z.object({
      status: LinearStageStatusSchema,
      timestamp: z.string(),
    }),
  ),
  timestamp: z.string(),
  error: z.string().optional(),
});

export type LinearStage = z.infer<typeof LinearStageSchema>;

/** Linear stage is past for pipeline purposes (real completion or catch-up). */
export function linearStageIsDone(status: LinearStageStatus | undefined): boolean {
  return status === 'completed' || status === 'notify-skipped';
}

// ---------------------------------------------------------------------------
// Stages object
// ---------------------------------------------------------------------------

export const TextIntegrityStagesSchema = z.object({
  submission: LinearStageSchema,
  processing: LinearStageSchema.optional(),
  reportGeneration: LinearStageSchema.optional(),
});

export type TextIntegrityStages = z.infer<typeof TextIntegrityStagesSchema>;

export const STAGE_ORDER: (keyof TextIntegrityStages)[] = [
  'submission',
  'processing',
  'reportGeneration',
];

// ---------------------------------------------------------------------------
// Stored similarity report (camelCase — converted from webhook payload)
// ---------------------------------------------------------------------------

export const StoredTopMatchSchema = z.object({
  percentage: z.number(),
  submissionId: z.string().optional(),
  sourceType: z.string(),
  matchedWordCountTotal: z.number(),
  submittedDate: z.string().optional(),
  institutionName: z.string().optional(),
  name: z.string(),
});
export type StoredTopMatch = z.infer<typeof StoredTopMatchSchema>;

export const StoredSimilarityReportSchema = z.object({
  submissionId: z.string(),
  overallMatchPercentage: z.number(),
  internetMatchPercentage: z.number().nullable().optional(),
  publicationMatchPercentage: z.number().nullable().optional(),
  submittedWorksMatchPercentage: z.number().nullable().optional(),
  status: z.enum(['PROCESSING', 'COMPLETE']),
  timeRequested: z.string(),
  timeGenerated: z.string().optional(),
  topSourceLargestMatchedWordCount: z.number().optional(),
  topMatches: z.array(StoredTopMatchSchema).max(5).optional(),
});
export type StoredSimilarityReport = z.infer<typeof StoredSimilarityReportSchema>;

/**
 * Transform a snake_case TCA payload into the camelCase stored shape.
 */
export function toStoredSimilarityReport(payload: SimilarityReportPayload): StoredSimilarityReport {
  return {
    submissionId: payload.submission_id,
    overallMatchPercentage: payload.overall_match_percentage,
    internetMatchPercentage: payload.internet_match_percentage,
    publicationMatchPercentage: payload.publication_match_percentage,
    submittedWorksMatchPercentage: payload.submitted_works_match_percentage,
    status: payload.status,
    timeRequested: payload.time_requested,
    timeGenerated: payload.time_generated,
    topSourceLargestMatchedWordCount: payload.top_source_largest_matched_word_count,
    topMatches: payload.top_matches?.map((m) => ({
      percentage: m.percentage,
      submissionId: m.submission_id,
      sourceType: m.source_type,
      matchedWordCountTotal: m.matched_word_count_total,
      submittedDate: m.submitted_date,
      institutionName: m.institution_name,
      name: m.name,
    })),
  };
}

// ---------------------------------------------------------------------------
// Summary (denormalized latest-webhook snapshot)
// ---------------------------------------------------------------------------

export const TextIntegrityLatestSchema = z.object({
  event: WebhookEventSchema,
  receivedAt: z.string(),
  overallMatchPercentage: z.number().optional(),
  reportPdfId: z.string().optional(),
  errorMessage: z.string().optional(),
});
export type TextIntegrityLatest = z.infer<typeof TextIntegrityLatestSchema>;

// ---------------------------------------------------------------------------
// Webhook event log entry
// ---------------------------------------------------------------------------

export const WebhookEventLogEntrySchema = z.object({
  event: WebhookEventSchema,
  receivedAt: z.string(),
  payload: z.any().optional(),
});

// ---------------------------------------------------------------------------
// Service manifest snapshot (stamped at submit time from relay service discovery)
// ---------------------------------------------------------------------------

export const ServiceManifestSnapshotSchema = z.object({
  name: z.string(),
  title: z.string(),
  logo: z.string(),
  version: z.string(),
});

export type ServiceManifestSnapshot = z.infer<typeof ServiceManifestSnapshotSchema>;

// ---------------------------------------------------------------------------
// Main service data schema
// ---------------------------------------------------------------------------

/**
 * Schema for Text Integrity check service run serviceData.
 *
 * `stages` is the source of truth for workflow progression.
 */
export const textIntegrityDataSchema = z.object({
  stages: TextIntegrityStagesSchema,

  /** Relay service manifest snapshot (name, title, logo URL, version) captured at submit time. */
  manifest: ServiceManifestSnapshotSchema.optional(),

  /** Denormalized snapshot of the most recent webhook event. */
  latest: TextIntegrityLatestSchema.optional(),

  /** Full webhook event history (capped). */
  webhookHistory: z.array(WebhookEventLogEntrySchema).optional(),

  // --- Top-level identifiers ---
  /** TCA submission ID from POST /submissions. */
  submissionId: z.string().optional(),
  /** PDF id (from TCA generate similarity PDF endpoint), used to download via relay. */
  reportPdfId: z.string().optional(),

  // --- Report data ---
  /** Summary report when processing is complete (camelCase stored shape). */
  summaryReport: StoredSimilarityReportSchema.optional(),
  /** URL to view the report in the TCA viewer (if available). */
  viewerUrl: z.string().optional(),
  /** Download PDF report URL (if TCA provides). */
  reportPdfUrl: z.string().optional(),
});

export type TextIntegrityDataSchema = z.infer<typeof textIntegrityDataSchema>;

// ---------------------------------------------------------------------------
// Defaults and helpers
// ---------------------------------------------------------------------------

export const MINIMAL_TEXT_INTEGRITY_SERVICE_DATA: TextIntegrityDataSchema = {
  stages: {
    submission: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  },
};

export const ALL_PENDING_STAGES: TextIntegrityStages = {
  submission: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  processing: { status: 'pending', history: [], timestamp: new Date().toISOString() },
  reportGeneration: { status: 'pending', history: [], timestamp: new Date().toISOString() },
};

// ---------------------------------------------------------------------------
// UI query helpers — components should use these instead of a flat enum state
// ---------------------------------------------------------------------------

/** True if any stage has errored. */
export function hasError(data: TextIntegrityDataSchema | undefined): boolean {
  if (!data?.stages) return false;
  return (
    data.stages.submission.status === 'error' ||
    data.stages.processing?.status === 'error' ||
    data.stages.reportGeneration?.status === 'error'
  );
}

/** First error message found across stages. */
export function getErrorMessage(data: TextIntegrityDataSchema | undefined): string | undefined {
  if (!data?.stages) return undefined;
  if (data.stages.submission.status === 'error') return data.stages.submission.error;
  if (data.stages.processing?.status === 'error') return data.stages.processing.error;
  if (data.stages.reportGeneration?.status === 'error') return data.stages.reportGeneration.error;
  return undefined;
}

/** True when the processing stage is done and a summary report is available. */
export function canShowResults(data: TextIntegrityDataSchema | undefined): boolean {
  if (!data?.stages) return false;
  return linearStageIsDone(data.stages.processing?.status);
}

/** True when the report generation stage is done and a PDF URL is available. */
export function canShowReportPdf(data: TextIntegrityDataSchema | undefined): boolean {
  if (!data?.stages) return false;
  return linearStageIsDone(data.stages.reportGeneration?.status);
}

/** @deprecated Use hasError/canShowResults/canShowReportPdf instead. Kept for test compatibility. */
export type TextIntegrityUIState =
  | 'no_run'
  | 'error'
  | 'submitting'
  | 'submission_complete'
  | 'processing_requested'
  | 'processing_complete'
  | 'report_generation_started'
  | 'report_generation_complete';

/** @deprecated Use hasError/canShowResults/canShowReportPdf instead. Kept for test compatibility. */
export function getCurrentTextIntegrityState(
  data: TextIntegrityDataSchema | undefined,
): TextIntegrityUIState {
  if (!data?.stages) return 'no_run';

  const { submission, processing, reportGeneration } = data.stages;

  if (submission.status === 'error') return 'error';
  if (processing?.status === 'error') return 'error';
  if (reportGeneration?.status === 'error') return 'error';

  if (linearStageIsDone(reportGeneration?.status)) return 'report_generation_complete';
  if (reportGeneration?.status === 'processing') return 'report_generation_started';
  if (linearStageIsDone(processing?.status)) return 'processing_complete';
  if (processing?.status === 'processing') return 'processing_requested';
  if (linearStageIsDone(submission.status)) return 'submission_complete';
  if (submission.status === 'processing' || submission.status === 'pending') return 'submitting';

  return 'no_run';
}

/** @deprecated Use getErrorMessage instead. */
export function getTextIntegrityError(
  data: TextIntegrityDataSchema | undefined,
): string | undefined {
  return getErrorMessage(data);
}

/**
 * Derive the current active stage info from the stages object (like proofig's getCurrentProofigStage).
 */
export function getCurrentTextIntegrityStage(stages: TextIntegrityStages) {
  let currentStageIndex = 0;
  let currentStage: keyof TextIntegrityStages = 'submission';
  let currentStageData: TextIntegrityStages[keyof TextIntegrityStages] = stages.submission;

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i];
    const stageData = stages[stage];
    const stageStatus = stageData?.status ?? 'pending';

    if (stageStatus === 'processing' || stageStatus === 'pending' || stageStatus === 'error') {
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
      break;
    }

    if (i === STAGE_ORDER.length - 1) {
      currentStageIndex = i;
      currentStage = stage;
      currentStageData = stageData;
    }
  }

  return { currentStageIndex, currentStage, currentStageData };
}
