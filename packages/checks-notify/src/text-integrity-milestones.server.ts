/** Text-integrity webhook events that warrant Slack (excludes intermediate/noisy events). */
export const TEXT_INTEGRITY_SLACK_WEBHOOK_EVENTS = new Set([
  'SUBMISSION_FAILED',
  'PROCESSING_PHASE_FAILED',
  'PROCESSING_PHASE_COMPLETE',
  'REPORT_GENERATION_FAILED',
  'REPORT_GENERATION_COMPLETE',
]);

const SIMILARITY_UPDATED_PROVIDER_EVENT = 'SIMILARITY_UPDATED';

export function isTextIntegritySlackWebhookEvent(
  event: string,
  metadata?: Record<string, unknown>,
): boolean {
  if (TEXT_INTEGRITY_SLACK_WEBHOOK_EVENTS.has(event)) return true;
  if (metadata?.provider_event === SIMILARITY_UPDATED_PROVIDER_EVENT) return true;
  return false;
}

export function textIntegrityWebhookColor(
  event: string,
  metadata?: Record<string, unknown>,
): 'good' | 'warning' | 'danger' {
  if (event.endsWith('_FAILED') || event === 'SUBMISSION_FAILED') return 'danger';
  if (metadata?.provider_event === SIMILARITY_UPDATED_PROVIDER_EVENT) return 'warning';
  if (event === 'REPORT_GENERATION_COMPLETE' || event === 'PROCESSING_PHASE_COMPLETE') {
    return 'good';
  }
  return 'good';
}

export function textIntegrityWebhookMessage(
  event: string,
  metadata?: Record<string, unknown>,
  overallMatchPercentage?: number | null,
): string {
  if (metadata?.provider_event === SIMILARITY_UPDATED_PROVIDER_EVENT) {
    return 'Text integrity similarity updated (report PDF invalidated)';
  }
  switch (event) {
    case 'SUBMISSION_FAILED':
      return 'Text integrity submission failed';
    case 'PROCESSING_PHASE_FAILED':
      return 'Text integrity processing failed';
    case 'PROCESSING_PHASE_COMPLETE': {
      const pct =
        overallMatchPercentage != null && !Number.isNaN(overallMatchPercentage)
          ? ` (${overallMatchPercentage}% overall match)`
          : '';
      return `Text integrity processing complete${pct}`;
    }
    case 'REPORT_GENERATION_FAILED':
      return 'Text integrity report generation failed';
    case 'REPORT_GENERATION_COMPLETE':
      return 'Text integrity report generation complete';
    default:
      return `Text integrity event: ${event}`;
  }
}
