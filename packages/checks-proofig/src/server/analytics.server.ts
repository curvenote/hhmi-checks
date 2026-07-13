import { HHMIChecksTrackEvent } from '@hhmi/checks-shared/analytics/events';
import {
  buildChecksRunStartFailedProps,
  buildChecksRunStartedProps,
  sanitizeAnalyticsErrorMessage,
} from '@hhmi/checks-shared/analytics/properties';
import {
  loadChecksRunAnalyticsContext,
  runLifecyclePropsFromRow,
} from '@hhmi/checks-shared/analytics/runContext.server';
import { trackChecksEvent, trackChecksEventForUser } from '@hhmi/checks-shared/analytics/server';
import type { TrackChecksContext } from '@hhmi/checks-shared/analytics/server';
import type { ChecksAnalyticsTrigger } from '@hhmi/checks-shared/analytics/properties';
import { PROOFIG_SLACK_MILESTONE_STATES } from '@hhmi/checks-notify';

const PROOFIG_COMPLETED_STATES = new Set(['Report: Clean', 'Report: Flagged']);
const PROOFIG_FAILED_STATES = new Set(['Deleted']);

function resolveProofigTerminalOutcome(state: string | undefined): 'completed' | 'failed' | null {
  if (!state) return null;
  if (PROOFIG_COMPLETED_STATES.has(state)) return 'completed';
  if (PROOFIG_FAILED_STATES.has(state)) return 'failed';
  return null;
}

function isProofigTerminalState(state: string | undefined): boolean {
  return resolveProofigTerminalOutcome(state) != null;
}

export async function trackProofigRunStarted(
  ctx: TrackChecksContext,
  workVersionId: string,
  checkRunId: string,
  options: {
    attempt?: number;
    retryOfRunId?: string;
    trigger?: ChecksAnalyticsTrigger | string | null;
    sourceFormat?: 'pdf' | 'docx';
    invokedByUserId?: string;
  },
): Promise<void> {
  try {
    const props = await loadChecksRunAnalyticsContext(workVersionId, 'proofig', {
      checkRunId,
      attempt: options.attempt,
      retryOfRunId: options.retryOfRunId,
      trigger: options.trigger,
      createdByUserId: ctx.user?.id,
      invokedByUserId: options.invokedByUserId ?? ctx.user?.id,
    });
    if (options.sourceFormat) {
      props.sourceFormat = options.sourceFormat;
      props.hasDocxConversion = options.sourceFormat === 'docx';
    }
    await trackChecksEvent(
      ctx,
      HHMIChecksTrackEvent.CHECKS_RUN_STARTED,
      buildChecksRunStartedProps(props),
    );
  } catch (err) {
    console.warn('Failed to track Proofig run started', err);
  }
}

export async function trackProofigRunStartFailed(
  ctx: TrackChecksContext,
  workVersionId: string,
  checkRunId: string | undefined,
  failureReason: string,
  options: { trigger?: ChecksAnalyticsTrigger | string | null } = {},
): Promise<void> {
  try {
    const props = await loadChecksRunAnalyticsContext(workVersionId, 'proofig', {
      checkRunId,
      trigger: options.trigger,
      createdByUserId: ctx.user?.id,
    });
    await trackChecksEvent(
      ctx,
      HHMIChecksTrackEvent.CHECKS_RUN_START_FAILED,
      buildChecksRunStartFailedProps(props, failureReason),
    );
  } catch (err) {
    console.warn('Failed to track Proofig run start failed', err);
  }
}

export async function trackProofigRunRetried(
  ctx: TrackChecksContext,
  workVersionId: string,
  sourceCheckRunId: string,
  newCheckRunId: string,
  options: {
    attempt?: number;
    trigger?: ChecksAnalyticsTrigger | string | null;
  },
): Promise<void> {
  try {
    const props = await loadChecksRunAnalyticsContext(workVersionId, 'proofig', {
      checkRunId: newCheckRunId,
      retryOfRunId: sourceCheckRunId,
      attempt: options.attempt,
      trigger: options.trigger ?? 'retry',
      createdByUserId: ctx.user?.id,
    });
    await trackChecksEvent(ctx, HHMIChecksTrackEvent.CHECKS_RUN_RETRIED, props);
  } catch (err) {
    console.warn('Failed to track Proofig run retried', err);
  }
}

export async function trackProofigStateTransition(
  run: {
    id: string;
    kind: string;
    work_version_id: string;
    created_by_id?: string | null;
    attempt?: number | null;
    retry_of_id?: string | null;
    date_created?: string | Date | null;
  },
  priorState: string | undefined,
  nextState: string | undefined,
  ctx?: TrackChecksContext,
  request?: Request,
): Promise<void> {
  try {
    if (isProofigTerminalState(priorState)) return;
    const outcome = resolveProofigTerminalOutcome(nextState);
    if (!outcome) return;

    const props = {
      ...runLifecyclePropsFromRow(run, 'proofig', {
        proofigState: nextState,
        failureReason:
          outcome === 'failed'
            ? sanitizeAnalyticsErrorMessage(`Proofig state: ${nextState}`)
            : undefined,
      }),
    };

    const event =
      outcome === 'completed'
        ? HHMIChecksTrackEvent.CHECKS_RUN_COMPLETED
        : HHMIChecksTrackEvent.CHECKS_RUN_FAILED;

    if (ctx) {
      await trackChecksEvent(ctx, event, props);
      return;
    }

    if (!PROOFIG_SLACK_MILESTONE_STATES.has(nextState ?? '')) return;
    await trackChecksEventForUser(run.created_by_id, event, props, request);
  } catch (err) {
    console.warn('Failed to track Proofig state transition', err);
  }
}
