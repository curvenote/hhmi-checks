import type { Workflow } from '@curvenote/scms-core';
import type { TramStop } from '../../components/StatusTramline.js';
import type {
  EmailProcessingMessage,
  PMCSubmissionVersionMetadataSection,
} from '../metadata.schema.js';

// Types for activities and warnings
export interface Activity {
  status: string;
  date?: string;
  warnings?: string[];
}

export interface Warning {
  toStatus: string;
  message: string;
}

/**
 * Helper: Create an error stop for insertion into the tramline
 */
function createErrorStop(
  workflow: Workflow,
  status: string,
  filteredActivities: Activity[],
  submissionLastModified?: string,
): TramStop {
  const stateLabel = workflow.states[status]?.label || status;
  return {
    title: stateLabel,
    status,
    completed: true,
    error: true,
    warning: false,
    subtitle: filteredActivities.find((a) => a.status === status)?.date || submissionLastModified,
  };
}

/**
 * Helper: Check if a status has a workflow tag
 */
function hasWorkflowTag(workflow: Workflow, status: string, tag: string): boolean {
  return workflow.states[status]?.tags?.includes(tag) || false;
}

/**
 * Helper: Check if a transition exists in the workflow
 */
function hasTransition(workflow: Workflow, fromState: string, toState: string): boolean {
  return workflow.transitions.some(
    (transition) =>
      transition.sourceStateName === fromState && transition.targetStateName === toState,
  );
}

/**
 * Helper: Pre-filter activities to remove contradictions
 *
 * Scans activities temporally and stops at the first contradiction between
 * a critical path state and its mutually exclusive alternative. Always includes
 * the currentStatus activity if it exists.
 */
function filterActivitiesByContradictions(
  activities: Activity[],
  currentStatus: string | undefined,
  criticalPathStates: string[],
  mutuallyExclusiveStates: Record<string, string | string[]>,
): Activity[] {
  const filteredActivities: Activity[] = [];
  const seenStatuses = new Set<string>();
  let hitContradiction = false;
  let currentStatusActivity: Activity | undefined;

  // Create reverse map for O(1) lookups: alternative → critical path
  const alternativeToCritical: Record<string, string> = {};
  for (const [critical, alternatives] of Object.entries(mutuallyExclusiveStates)) {
    if (Array.isArray(alternatives)) {
      for (const alternative of alternatives) {
        alternativeToCritical[alternative] = critical;
      }
    } else {
      alternativeToCritical[alternatives] = critical;
    }
  }

  for (const activity of activities) {
    const activityStatus = activity.status;

    // Track the current status activity in case we need it later
    if (currentStatus && activityStatus === currentStatus) {
      currentStatusActivity = activity;
    }

    // If we've already hit a contradiction, only keep looking for currentStatus
    if (hitContradiction) {
      continue;
    }

    // Check if this creates a contradiction with what we've already seen
    let isContradiction = false;

    // If this is a critical path state, check if we've seen its alternative
    if (criticalPathStates.includes(activityStatus)) {
      const alternativeStatuses = mutuallyExclusiveStates[activityStatus];
      if (alternativeStatuses) {
        const alternatives = Array.isArray(alternativeStatuses)
          ? alternativeStatuses
          : [alternativeStatuses];
        if (alternatives.some((alt) => seenStatuses.has(alt))) {
          // Seen alternative before critical path - contradiction!
          isContradiction = true;
        }
      }
    } else {
      // Check if this is an alternative to a critical path state we've seen
      const criticalPathState = alternativeToCritical[activityStatus];

      if (criticalPathState && seenStatuses.has(criticalPathState)) {
        // Seen critical path before alternative - contradiction!
        isContradiction = true;
      }
    }

    if (isContradiction) {
      // Mark that we hit a contradiction
      hitContradiction = true;
      continue;
    }

    // No contradiction - keep this activity
    filteredActivities.push(activity);
    seenStatuses.add(activityStatus);
  }

  // Ensure currentStatus activity is included if it exists and isn't already
  if (currentStatusActivity && !seenStatuses.has(currentStatus!)) {
    filteredActivities.push(currentStatusActivity);
  }

  return filteredActivities;
}

/**
 * V2 Implementation: Generate tramline stops based on workflow state logic
 *
 * This function creates a visual representation of a submission's progress through a workflow,
 * showing the critical path states and their completion status. The current status always
 * dominates the current state, with activities used only to fill in historical data.
 *
 * ## Requirements & Constraints
 *
 * 1. **Current Status Dominance**: The `currentStatus` parameter always determines the current
 *    state in the tramline, regardless of what activities are present.
 *
 * 2. **Activities for Historical Data Only**: Activities are used solely to:
 *    - Fill in completion status for states that occurred before the current status
 *    - Provide raw date strings (ISO format) for completed states
 *    - Provide warning status based on activity warnings or state tags
 *    - Activities for error states, alternatives when critical path exists, and future states are ignored
 *
 * 3. **No State Addition**: Activities should never cause new states to be added to the tramline
 *    beyond what's defined in the critical path, except for unexpected error states.
 *
 * 4. **No State Reordering**: Activities should never change which state is considered the
 *    "last completed state" - this is always determined by the current status position.
 *
 * 5. **No Date Formatting**: Raw date strings from activities are passed through as-is. The
 *    presentation layer is responsible for formatting dates according to locale and display needs.
 *
 * ## Business Logic
 *
 * ### Critical Path Generation
 * - Generates tramline stops based on the provided `criticalPathStates` array
 * - Each critical path state becomes a tramline stop with completion status based on position
 * - States at or before the current status index are marked as completed
 *
 * ### Mutually Exclusive State Handling
 * - Some workflows have alternative states that can replace critical path states
 * - Alternative states are used in two cases ONLY:
 *   1. **As Current Status**: If the current status itself is an alternative state, it replaces its critical path counterpart
 *   2. **No Critical Path Activity**: If an alternative has an activity BUT the critical path state does NOT
 * - If BOTH the critical path state AND its alternative have activities, the critical path state is used (dominates)
 * - Example: If `FROM_CACHE` is the current status, it replaces `PROCESSING` in the tramline
 * - Example: If only `FROM_CACHE` has an activity (no `PROCESSING` activity), use `FROM_CACHE`
 * - Example: If both `PROCESSING` and `FROM_CACHE` have activities, use `PROCESSING` (ignore `FROM_CACHE`)
 * - Alternative states inherit warning/error flags from their workflow state tags
 * - This allows workflows to show different paths taken while maintaining tramline structure
 *
 * ### Error State Handling
 * There are two types of error states:
 *
 * 1. **Replacement Errors**: Error states that replace a critical path state
 *    - Identified by checking for transitions from critical path states to error states
 *    - Only replaces the current status if there's a workflow transition to the error
 *    - Prefers later critical path states when multiple transitions exist
 *
 * 2. **Unexpected Failures**: Error states without workflow transitions
 *    - Inserted immediately after the last completed state (based on activities)
 *    - All states after the insertion point are marked as incomplete
 *    - Represents errors that can happen at any time without defined transitions
 *
 * All error states are marked with `error: true` and use activity data for dates/metadata.
 *
 * ### Non-Error End State Handling
 * Some workflows have end states that are not errors but are also not part of the critical path.
 * These states (like REQUEST_NEW_VERSION in PMC workflow) have the `'end'` tag but not the `'error'` tag.
 *
 * **Insertion Logic**: Non-error end states are inserted after the last completed state, similar to unexpected failures.
 * - They are marked as `completed: true` and `error: false`
 * - They inherit warning status from workflow state tags (`'warning'` tag)
 * - They use activity data for dates and warning messages
 * - All states after the insertion point are marked as incomplete
 * - This allows workflows to show alternative end states that don't follow the critical path
 *
 * ### Warning Handling
 * - Warnings can come from two sources:
 *   1. **Activity Warnings**: Provided as an array of strings in the activity's `warnings` field
 *   2. **State Tags**: Workflow states can have a `'warning'` tag indicating inherent warning status
 * - When an activity has warnings OR the workflow state has a warning tag, the tramline stop is marked with `warning: true`
 * - Warning status is determined by the presence of warnings in activities or state tags
 * - State-level warning tags provide warnings even when no activity warnings exist
 *
 * ### Undefined Status Handling
 * - When `currentStatus` is undefined, all critical path states are shown as incomplete
 * - No state is marked as current when status is undefined
 *
 * ### End State Detection
 * - Determines if workflow has ended by checking if current status has `'end'` tag
 *
 * @param workflow - The workflow definition containing states, transitions, and tags
 * @param currentStatus - The current status of the submission (undefined if unknown/not set)
 * @param activities - Array of activities used for historical data and error detection (with raw ISO date strings)
 * @param criticalPathStates - Array of states representing the critical path through the workflow
 * @param mutuallyExclusiveStates - Optional map of critical path states to their mutually exclusive alternatives
 * @param submissionLastModified - Optional submission last modified date to use as fallback when currentStatus has no matching activity
 * @returns Object containing tramline stops (with raw date strings) and ended status
 */
export function generateTramline(
  workflow: Workflow,
  currentStatus: string | undefined,
  activities: Activity[] = [],
  criticalPathStates: string[] = [],
  mutuallyExclusiveStates: Record<string, string | string[]> = {},
  submissionLastModified?: string,
): { tramline: TramStop[]; ended: boolean } {
  // If no critical path states provided, return empty
  if (criticalPathStates.length === 0) {
    return {
      tramline: [],
      ended: false,
    };
  }

  // Pre-filter activities to remove contradictions
  const filteredActivities = filterActivitiesByContradictions(
    activities,
    currentStatus,
    criticalPathStates,
    mutuallyExclusiveStates,
  );

  // Handle undefined currentStatus - show all states as incomplete
  if (currentStatus === undefined) {
    const tramline: TramStop[] = criticalPathStates.map((status) => ({
      title: status,
      status,
      completed: false,
      error: false,
      warning: false,
    }));

    return {
      tramline,
      ended: false,
    };
  }

  const effectiveStatus = currentStatus;

  // Find the current status index in the critical path
  let currentIndex = criticalPathStates.indexOf(effectiveStatus);
  let isErrorState = false;
  let isUnexpectedFailure = false;
  let isAlternativeState = false;

  // If current status is not in critical path, check if it's an alternative or error state
  if (currentIndex === -1) {
    // First, check if current status is a mutually exclusive alternative state
    // Look for which critical path state it's an alternative for
    // Iterate from the end to give precedence to later states (more specific)
    for (let i = criticalPathStates.length - 1; i >= 0; i--) {
      const criticalState = criticalPathStates[i];
      const alternatives = mutuallyExclusiveStates[criticalState];

      // Handle both old string format and new array format
      if (Array.isArray(alternatives)) {
        if (alternatives.includes(effectiveStatus)) {
          // Found it! This is an alternative to a critical path state
          currentIndex = i;
          isAlternativeState = true;
          break;
        }
      } else if (alternatives === effectiveStatus) {
        // Backward compatibility with old string format
        currentIndex = i;
        isAlternativeState = true;
        break;
      }
    }

    // If not an alternative state, check if it's an error state or non-error end state
    if (currentIndex === -1) {
      if (hasWorkflowTag(workflow, effectiveStatus, 'error')) {
        isErrorState = true;
        // For error states, we need to find which critical path state to replace
        // Look for a transition from a critical path state to this error state
        // Prefer later states in the critical path (more recent states)
        for (let i = criticalPathStates.length - 1; i >= 0; i--) {
          const criticalState = criticalPathStates[i];
          if (hasTransition(workflow, criticalState, effectiveStatus)) {
            currentIndex = i;
            break;
          }
        }
        // If no transition found, this is an unexpected failure
        // Insert it after the last completed state
        if (currentIndex === -1) {
          isUnexpectedFailure = true;
          // Find the last completed state by scanning filtered activities
          // Continue scanning through ALL critical path states to find the true last activity,
          // even if there are gaps (this allows end states to use as much tramline info as possible)
          let lastCompletedIndex = -1;
          for (let i = 0; i < criticalPathStates.length; i++) {
            const criticalState = criticalPathStates[i];
            const alternativeStates = mutuallyExclusiveStates[criticalState];
            const alternatives = alternativeStates
              ? Array.isArray(alternativeStates)
                ? alternativeStates
                : [alternativeStates]
              : [];

            // Check if this state (or its alternative) exists in filtered activities
            const hasActivity = filteredActivities.some(
              (a) => a.status === criticalState || alternatives.includes(a.status),
            );

            if (hasActivity) {
              lastCompletedIndex = i;
              // Don't break - continue to find the true last activity even if there are gaps
            }
          }

          // Insert after the last completed state, or at the beginning if none completed
          currentIndex = lastCompletedIndex + 1;
        }
      } else if (hasWorkflowTag(workflow, effectiveStatus, 'end')) {
        // Non-error end state (like REQUEST_NEW_VERSION) - insert after last completed state
        isUnexpectedFailure = true; // Reuse the insertion logic
        // Find the last completed state by scanning filtered activities
        // Continue scanning through ALL critical path states to find the true last activity,
        // even if there are gaps (this allows end states to use as much tramline info as possible)
        let lastCompletedIndex = -1;
        for (let i = 0; i < criticalPathStates.length; i++) {
          const criticalState = criticalPathStates[i];
          const alternativeStates = mutuallyExclusiveStates[criticalState];
          const alternatives = alternativeStates
            ? Array.isArray(alternativeStates)
              ? alternativeStates
              : [alternativeStates]
            : [];

          // Check if this state (or its alternative) exists in filtered activities
          const hasActivity = filteredActivities.some(
            (a) => a.status === criticalState || alternatives.includes(a.status),
          );

          if (hasActivity) {
            lastCompletedIndex = i;
            // Don't break - continue to find the true last activity even if there are gaps
          }
        }

        // Insert after the last completed state, or at the beginning if none completed
        currentIndex = lastCompletedIndex + 1;
      } else {
        // Not an error state, not an alternative state, not an end state, and not in critical path
        // Return a single error TramStop for unknown status
        return {
          tramline: [
            {
              title: `Unknown Status: ${effectiveStatus}`,
              status: effectiveStatus,
              completed: true,
              error: true,
              warning: false,
              subtitle:
                filteredActivities.find((a) => a.status === effectiveStatus)?.date ||
                submissionLastModified,
            },
          ],
          ended: true, // Unknown status represents an end state
        };
      }
    }
  }

  // Find error states from filtered activities
  const errorStates = filteredActivities.filter((activity) =>
    hasWorkflowTag(workflow, activity.status, 'error'),
  );

  // Build tramline based on critical path
  const tramline: TramStop[] = criticalPathStates.map((status, index) => {
    let displayStatus = status;
    // Only use activity data for completed states (enforces current status dominance)
    // For unexpected failures, don't use activity at currentIndex (that's where we'll insert)
    const shouldUseActivity = isUnexpectedFailure ? index < currentIndex : index <= currentIndex;
    let activity = shouldUseActivity
      ? filteredActivities.find((a) => a.status === status)
      : undefined;

    // Check if a mutually exclusive alternative state should be used
    const alternatives = mutuallyExclusiveStates[status];
    const alternativeStatuses = Array.isArray(alternatives)
      ? alternatives
      : alternatives
        ? [alternatives]
        : [];

    // Check if we should use the alternative state:
    // 1. If the current status itself IS the alternative state at this position, use it
    // 2. If the critical path state has no activity but the alternative does (and we should use activities), use alternative
    //    BUT NOT if both exist - in that case, respect current status dominance (use the critical path state)
    if (
      isAlternativeState &&
      index === currentIndex &&
      alternativeStatuses.includes(effectiveStatus)
    ) {
      // Current status IS the alternative state - use it
      displayStatus = effectiveStatus;
      activity = filteredActivities.find((a) => a.status === effectiveStatus);
    } else if (alternativeStatuses.length > 0 && !activity && shouldUseActivity) {
      // No critical path activity exists, check if any alternative exists
      for (const alternativeStatus of alternativeStatuses) {
        const alternativeActivity = filteredActivities.find((a) => a.status === alternativeStatus);
        if (alternativeActivity) {
          // Alternative exists and we should use it
          displayStatus = alternativeStatus;
          activity = alternativeActivity;
          break;
        }
      }
    }

    // Determine completion status based on position and unexpected failure handling
    let isCompleted = isUnexpectedFailure ? index < currentIndex : index <= currentIndex;
    let isError = false;

    // Check if this critical path state should be replaced by an error state
    if (
      isErrorState &&
      !isUnexpectedFailure &&
      index === currentIndex &&
      currentIndex < criticalPathStates.length
    ) {
      // Current status is an error state, replace this critical path state
      displayStatus = effectiveStatus;
      activity = filteredActivities.find((a) => a.status === effectiveStatus);
      isCompleted = true;
      isError = true;
    } else if (status === effectiveStatus) {
      // Current status is in critical path, check for error activities
      for (const errorActivity of errorStates) {
        if (!hasWorkflowTag(workflow, errorActivity.status, 'error')) continue;

        // Check if there's a transition from this critical path state to the error state
        if (hasTransition(workflow, status, errorActivity.status)) {
          // Replace this critical path state with the error state
          displayStatus = errorActivity.status;
          activity = errorActivity;
          isCompleted = true;
          isError = true;
          break;
        }
      }
    }

    // Use activity date if available, otherwise fall back to submission last modified for current status
    const subtitle =
      activity?.date ||
      (index === currentIndex && submissionLastModified ? submissionLastModified : undefined);

    // Check workflow state tags for warning/error indicators
    const hasStateWarningTag = hasWorkflowTag(workflow, displayStatus, 'warning');
    const hasStateErrorTag = hasWorkflowTag(workflow, displayStatus, 'error');

    // Check for state-level warning tag (like V1)
    // Note: Activity warnings are not used in V1 - warnings come from metadata
    const hasWarnings = hasStateWarningTag;

    // Combine computed error flag with state-level error tag
    const hasError = isError || hasStateErrorTag;

    // Get the label from the workflow state for the title
    const stateLabel = workflow.states[displayStatus]?.label || displayStatus;

    return {
      title: stateLabel,
      status: displayStatus,
      completed: isCompleted,
      error: hasError,
      warning: hasWarnings,
      subtitle,
    };
  });

  // If current status is an error state or non-error end state that should be inserted (not replacing)
  if (isUnexpectedFailure) {
    // Create the stop to insert - handle both error states and non-error end states
    const stopToInsert = hasWorkflowTag(workflow, effectiveStatus, 'error')
      ? createErrorStop(workflow, effectiveStatus, filteredActivities, submissionLastModified)
      : {
          title: workflow.states[effectiveStatus]?.label || effectiveStatus,
          status: effectiveStatus,
          completed: true,
          error: false,
          warning: hasWorkflowTag(workflow, effectiveStatus, 'warning'),
          subtitle:
            filteredActivities.find((a) => a.status === effectiveStatus)?.date ||
            submissionLastModified,
        };

    // Insert the stop at the calculated position
    tramline.splice(currentIndex, 0, stopToInsert);

    // Adjust completion status for states after the insertion
    for (let i = currentIndex + 1; i < tramline.length; i++) {
      tramline[i].completed = false;
    }
  } else if (isErrorState && currentIndex >= criticalPathStates.length) {
    // Insert the error state at the calculated position
    tramline.splice(
      currentIndex,
      0,
      createErrorStop(workflow, effectiveStatus, filteredActivities, submissionLastModified),
    );
  }

  // NOTE: We do NOT insert additional error states from activities beyond what we've already handled
  // Current status dominance means we only consider the current status and activities up to it
  // Any error activities after the current status should be ignored

  // Check if workflow has ended (current status has 'end' tag)
  const ended = hasWorkflowTag(workflow, effectiveStatus, 'end');

  return {
    tramline,
    ended,
  };
}

/**
 * Decorates tramline stops with email processing warnings and errors
 *
 * This function post-processes the generated tramline by scanning the email processing
 * metadata for warnings and errors, then decorating matching tram stops based on their
 * status matching the toStatus field in the email processing data.
 *
 * @param tramline - The generated tramline array
 * @param metadata - The submission version metadata containing email processing data
 * @returns A new tramline array with decorated warning/error flags
 */
export function decorateTramlineWithEmailProcessingOutcomes(
  tramline: TramStop[],
  metadata?: PMCSubmissionVersionMetadataSection,
): TramStop[] {
  // If no metadata or no email processing data, return a copy of the tramline
  if (!metadata?.pmc?.emailProcessing) {
    return tramline.map((stop) => ({ ...stop }));
  }

  const emailProcessing = metadata.pmc.emailProcessing;

  // Defensive programming: handle malformed objects
  if (!emailProcessing || !emailProcessing.messages || !Array.isArray(emailProcessing.messages)) {
    return tramline.map((stop) => ({ ...stop }));
  }

  const messages = emailProcessing.messages;

  if (messages.length === 0) {
    return tramline.map((stop) => ({ ...stop }));
  }

  // Create maps for quick lookup of warnings and errors by toStatus
  const warningsByStatus = new Map<string, EmailProcessingMessage[]>();
  const errorsByStatus = new Map<string, EmailProcessingMessage[]>();

  // Group messages by type and toStatus
  messages.forEach((message) => {
    if (message.type === 'warning') {
      if (!warningsByStatus.has(message.toStatus)) {
        warningsByStatus.set(message.toStatus, []);
      }
      warningsByStatus.get(message.toStatus)!.push(message);
    } else if (message.type === 'error') {
      if (!errorsByStatus.has(message.toStatus)) {
        errorsByStatus.set(message.toStatus, []);
      }
      errorsByStatus.get(message.toStatus)!.push(message);
    }
  });

  // Decorate the tramline with email processing outcomes
  return tramline.map((stop) => {
    const status = stop.status;
    const hasWarnings = warningsByStatus.has(status);
    const hasErrors = errorsByStatus.has(status);

    // If there are errors for this status, mark as error (errors take precedence)
    if (hasErrors) {
      return {
        ...stop,
        error: true,
        warning: false, // Clear warning if there are errors
      };
    }

    // If there are warnings for this status and the stop is not already in error state, mark as warning
    if (hasWarnings && !stop.error) {
      return {
        ...stop,
        warning: true,
        error: false, // Ensure error is false if only warnings
      };
    }

    // If the stop is already in an error state, preserve it even if email processing only has warnings
    if (stop.error) {
      return stop; // Keep existing error state unchanged
    }

    // No email processing outcomes for this status, return unchanged
    return stop;
  });
}
