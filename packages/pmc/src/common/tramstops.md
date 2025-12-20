# PMC TramStops Documentation

## Overview

The PMC TramStops system provides a visual representation of the workflow progression for PMC deposits. It combines data from multiple sources to show users where their submission stands in the process, what has been completed, and what comes next.

## Core Components

### Data Sources

The tramline generation uses three key data sources:

1. **Activity Feed** (`Activity` table) - Historical record of all status transitions
2. **Current Submission Status** - The current status of the submission version
3. **Workflow Definition** - The PMC workflow states and their properties

### Key Concepts

#### Critical Path States

The critical path represents the "happy path" through the PMC workflow - the standard sequence of states that most successful deposits follow:

```typescript
const CRITICAL_PATH_STATES = [
  PMC_STATE_NAMES.PENDING,                    // New deposit uploaded
  PMC_STATE_NAMES.DEPOSITED,                  // Sent to PMC
  PMC_STATE_NAMES.DEPOSIT_CONFIRMED_BY_PMC,   // PMC confirms receipt
  PMC_STATE_NAMES.REVIEWER_APPROVED_INITIAL,  // Initial review passed
  PMC_STATE_NAMES.NIHMS_CONVERSION_COMPLETE,  // NIHMS processing done
  PMC_STATE_NAMES.REVIEWER_APPROVED_FINAL,    // Final review passed
  PMC_STATE_NAMES.AVAILABLE_ON_PMC,           // Published on PMC
];
```

**Visual Representation:**
```
○────────────○────────────○────────────────○────────────────○──────────────○────────────○
│            │            │                │                │              │            │
PENDING  DEPOSITED  PMC_CONFIRMED  REVIEWER_INITIAL  NIHMS_COMPLETE  REVIEWER_FINAL  AVAILABLE
```

#### Mutually Exclusive States

Some workflow states are mutually exclusive - when one occurs, it replaces its corresponding critical path state:

```typescript
const MUTUALLY_EXCLUSIVE_STATES = {
  [PMC_STATE_NAMES.DEPOSIT_CONFIRMED_BY_PMC]: PMC_STATE_NAMES.DEPOSIT_REJECTED_BY_PMC,
  [PMC_STATE_NAMES.DEPOSITED]: PMC_STATE_NAMES.NO_ACTION_NEEDED,
  [PMC_STATE_NAMES.REVIEWER_APPROVED_INITIAL]: PMC_STATE_NAMES.REVIEWER_REJECTED_INITIAL,
};
```

**Example - PMC Rejection:**
```
Before: ●────────────●────────────○────────────○────○────○────○
        │            │            │            │    │    │    │
        PENDING  DEPOSITED  PMC_CONFIRMED ...

After:  ●────────────●────────────●────────────○────○────○────○
        │            │            │            │    │    │    │
        PENDING  DEPOSITED  PMC_REJECTED ...
```

#### End Condition States

These states indicate that the workflow has ended and no further progress is possible:

```typescript
const END_CONDITION_STATES = [
  PMC_STATE_NAMES.FAILED,                    // System/process failure
  PMC_STATE_NAMES.REMOVED_FROM_PROCESSING,   // Removed by NIHMS
  PMC_STATE_NAMES.REVIEWER_REJECTED_INITIAL, // Rejected by reviewer
  PMC_STATE_NAMES.REQUEST_NEW_VERSION,       // New version requested
  PMC_STATE_NAMES.NO_ACTION_NEEDED,          // No PMC action required
];
```

## Tramline Generation Logic

### Step 1: Generate Base Tramline

The base tramline is generated from the critical path states, with mutual exclusive state swapping applied based on the activity feed:

```typescript
const baseTramline = CRITICAL_PATH_STATES.map((status) => {
  // Check for mutual exclusive variants in activity feed
  const variantState = MUTUALLY_EXCLUSIVE_STATES[status];
  const useVariant = variantState && completedStates.has(variantState);
  const actualStatus = useVariant ? variantState : status;
  
  return {
    status: actualStatus,
    title: workflow.states[actualStatus].label,
    completed: completedStates.has(actualStatus),
    error: workflow.states[actualStatus].tags.includes('error'),
    warning: workflow.states[actualStatus].tags.includes('warning'),
    // ... other properties
  };
});
```

### Step 2: Handle End Condition States

When the current submission status is an end condition state that differs from the latest activity:

#### Case A: End State with Mutual Mapping (Replacement)

If the end state maps to a critical path state that comes after the last completed stop, **replace** that critical path state:

```typescript
// Example: NO_ACTION_NEEDED replaces DEPOSITED
// Activity: [PENDING]
// Current Status: NO_ACTION_NEEDED

Before: ●────────────○────────────○────────────○────○────○────○
        │            │            │            │    │    │    │
        PENDING  DEPOSITED  PMC_CONFIRMED ...

After:  ●────────────●────────────○────────────○────○────○────○  (greyed out)
        │            │            │            │    │    │    │
        PENDING  NO_ACTION ...
```

#### Case B: End State without Mutual Mapping (Insertion)

If the end state has no mutual mapping, **insert** it after the last completed stop:

```typescript
// Example: FAILED state after some progress
// Activity: [PENDING, DEPOSITED, PMC_CONFIRMED]
// Current Status: FAILED

Before: ●────────────●────────────●────────────○────────────○────○────○
        │            │            │            │            │    │    │
        PENDING  DEPOSITED  PMC_CONFIRMED  REVIEWER_INITIAL ...

After:  ●────────────●────────────●────────────●────────────○────○────○  (greyed out)
        │            │            │            │            │    │    │    │
        PENDING  DEPOSITED  PMC_CONFIRMED  FAILED ...
```

### Step 3: Determine Workflow End Status

The workflow is considered "ended" when:

1. Any tramline stop is completed and has the `'end'` tag
2. An end condition state was added/replaced
3. Any state in the activity feed has the `'end'` tag

When ended, all subsequent stops are greyed out visually.

## Detailed Scenarios

### Scenario 1: Successful Happy Path

**Data:**
- Activity: `[PENDING, DEPOSITED, PMC_CONFIRMED, REVIEWER_INITIAL, NIHMS_COMPLETE, REVIEWER_FINAL, AVAILABLE]`
- Current Status: `AVAILABLE_ON_PMC`

**Result:**
```
●────────────●────────────●────────────────●────────────────●──────────────●────────────●
│            │            │                │                │              │            │
PENDING  DEPOSITED  PMC_CONFIRMED  REVIEWER_INITIAL  NIHMS_COMPLETE  REVIEWER_FINAL  AVAILABLE
```

All stops completed, workflow ended successfully.

### Scenario 2: PMC Rejection

**Data:**
- Activity: `[PENDING, DEPOSITED, PMC_REJECTED]`
- Current Status: `DEPOSIT_REJECTED_BY_PMC`

**Result:**
```
●────────────●────────────●────────────○────○────○────○  (greyed out)
│            │            │            │    │    │    │
PENDING  DEPOSITED  PMC_REJECTED ...
```

Mutual exclusive state replacement occurred, workflow ended due to rejection.

### Scenario 3: No Action Needed

**Data:**
- Activity: `[PENDING]` (no further activity)
- Current Status: `NO_ACTION_NEEDED`

**Result:**
```
●────────────●────────────○────────────○────○────○────○  (greyed out)
│            │            │            │    │    │    │
PENDING  NO_ACTION ...
```

End state with mutual mapping replaced `DEPOSITED`, workflow ended.

### Scenario 4: System Failure

**Data:**
- Activity: `[PENDING, DEPOSITED, PMC_CONFIRMED]`
- Current Status: `FAILED`

**Result:**
```
●────────────●────────────●────────────●────────────○────○────○  (greyed out)
│            │            │            │            │    │    │    │
PENDING  DEPOSITED  PMC_CONFIRMED  FAILED ...
```

End state without mutual mapping inserted after last completed stop.

### Scenario 5: Request New Version

**Data:**
- Activity: `[PENDING, DEPOSITED, PMC_REJECTED]`
- Current Status: `REQUEST_NEW_VERSION`

**Result:**
```
●────────────●────────────●────────────●────────────────────○────○────○  (greyed out)
│            │            │            │                    │    │    │
PENDING  DEPOSITED  PMC_REJECTED  REQUEST_NEW_VERSION ...
```

End state inserted after the mutual exclusive state replacement.

## State Tags and Visual Styling

### Error States
States with `['error']` tag are displayed with red styling and warning icons:
- `FAILED`
- `DEPOSIT_REJECTED_BY_PMC`
- `REVIEWER_REJECTED_INITIAL`
- `REMOVED_FROM_PROCESSING`

### Warning States
States with `['warning']` tag are displayed with yellow styling:
- `INCOMPLETE`

### End States
States with `['end']` tag cause the workflow to be marked as ended:
- `NO_ACTION_NEEDED`
- `AVAILABLE_ON_PMC`
- All error states
- `REQUEST_NEW_VERSION`

### Success States
When a workflow ends successfully (completed with no errors/warnings), all completed stops get green styling.

## Implementation Details

### Activity Feed Priority
The activity feed takes precedence for determining completion status and timestamps. States are marked as completed only if they appear in the activity feed with a `SUBMISSION_VERSION_STATUS_CHANGE` record.

### Current Status Handling
The current submission status is used to:
1. Detect end conditions not yet reflected in the activity feed
2. Trigger mutual exclusive state replacements
3. Insert additional end condition states when needed

### Completion Logic
```typescript
const isCompleted = completedStates.has(actualStatus);
const completionDate = isCompleted ? completedStates.get(actualStatus) : undefined;
```

Only states with activity records get completion dates and are marked as completed.

### Edge Cases

1. **No Activity**: If there's no activity but current status is an end condition, it will still be displayed appropriately
2. **Multiple End States**: Only the current status end state is added/replaced
3. **Concurrent Activity**: Latest activity status takes precedence
4. **Missing Workflow States**: States not in workflow definition are skipped

## Testing

The tramline logic is comprehensively tested in `tramline.spec.ts` with scenarios covering:
- Basic tramline generation
- Mutual exclusive state swapping
- End condition state insertion
- End condition state replacement
- Workflow end detection
- Edge cases and error conditions

## Usage

```typescript
import { generateTramlineFromActivity } from './tramstops';

const { tramline, ended } = await generateTramlineFromActivity(
  submissionId,
  workflow,
  currentStatus
);

// tramline: Array of TramStop objects for StatusTramline component
// ended: Boolean indicating if workflow has ended
```

The resulting tramline is consumed by the `StatusTramline` React component for visual display.
