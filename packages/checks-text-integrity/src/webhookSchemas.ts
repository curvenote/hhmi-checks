import { z } from 'zod';

/**
 * TCA webhook event names.
 * Validated against the events observed from the checks-relay iThenticate plugin.
 */
export enum WebhookEvent {
  SubmissionComplete = 'SUBMISSION_COMPLETE',
  SubmissionFailed = 'SUBMISSION_FAILED',
  ProcessingPhaseStarted = 'PROCESSING_PHASE_STARTED',
  ProcessingPhaseComplete = 'PROCESSING_PHASE_COMPLETE',
  ReportGenerationStarted = 'REPORT_GENERATION_STARTED',
  ReportGenerationComplete = 'REPORT_GENERATION_COMPLETE',
  ReportGenerationFailed = 'REPORT_GENERATION_FAILED',
}

export const WEBHOOK_EVENTS: readonly WebhookEvent[] = Object.values(WebhookEvent);

export const WebhookEventSchema = z.nativeEnum(WebhookEvent);

/**
 * Zod schema for the outer webhook body forwarded by checks-relay.
 */
export const WebhookBodySchema = z.object({
  event: WebhookEventSchema,
  payload: z
    .object({
      provider_payload: z.unknown().optional(),
      error_message: z.string().optional(),
      report: z
        .object({
          report_id: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

export type WebhookBody = z.infer<typeof WebhookBodySchema>;

// ---------------------------------------------------------------------------
// Similarity report (TCA PROCESSING_PHASE_COMPLETE payload)
// ---------------------------------------------------------------------------

export const TopMatchSchema = z.object({
  percentage: z.number(),
  submission_id: z.string().optional(),
  source_type: z.string(),
  matched_word_count_total: z.number(),
  submitted_date: z.string().optional(),
  institution_name: z.string().optional(),
  name: z.string(),
});
export type TopMatch = z.infer<typeof TopMatchSchema>;

export const SimilarityReportPayloadSchema = z.object({
  submission_id: z.string(),
  overall_match_percentage: z.number(),
  internet_match_percentage: z.number().nullable().optional(),
  publication_match_percentage: z.number().nullable().optional(),
  submitted_works_match_percentage: z.number().nullable().optional(),
  status: z.enum(['PROCESSING', 'COMPLETE']),
  time_requested: z.string(),
  time_generated: z.string().optional(),
  top_source_largest_matched_word_count: z.number().optional(),
  top_matches: z.array(TopMatchSchema).max(5).optional(),
  metadata: z.object({ custom: z.string().optional() }).passthrough().optional(),
});
export type SimilarityReport = z.infer<typeof SimilarityReportPayloadSchema>;
