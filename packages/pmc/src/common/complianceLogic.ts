import type {
  ComplianceWizardState,
  LogicResult,
  ComplianceWizardConfig,
} from './complianceTypes.js';

/**
 * Generates a key for the explicit mapping table from wizard state
 * Format: "hhmiPolicy,nihPolicy,publishingStage,openAccess,ccLicense"
 */
export function generateStateKey(state: ComplianceWizardState): string {
  const parts = [
    state.hhmiPolicy,
    state.nihPolicy,
    state.publishingStage,
    state.openAccess,
    state.ccLicense ?? 'null', // Handle conditional questions
  ];
  return parts.join(',');
}

/**
 * Computes the outcome(s) for a given wizard state using O(1) lookup
 */
export function computeOutcome(
  state: ComplianceWizardState,
  config: ComplianceWizardConfig,
): LogicResult {
  try {
    const key = generateStateKey(state);
    const outcomes = config.logic.explicit_mappings[key];

    if (outcomes) {
      return { outcomes };
    }

    // Fallback to default
    return { outcomes: config.logic.default };
  } catch (error) {
    console.error('Error computing outcome:', error);
    // Return default outcome on error
    return { outcomes: config.logic.default };
  }
}

/**
 * Checks if a question should be shown based on conditional logic
 */
export function shouldShowQuestion(
  questionId: string,
  state: ComplianceWizardState,
  config: ComplianceWizardConfig,
): boolean {
  const question = config.questions[questionId];
  if (!question?.conditional) {
    return true;
  }

  // Simple conditional evaluation
  // Currently only supports: "openAccess == 'open'"
  if (question.conditional === "openAccess == 'open'") {
    return state.openAccess === 'open';
  }

  // Add more conditional logic as needed
  return true;
}

/**
 * Gets the next question to show based on current state
 */
export function getNextQuestion(
  state: ComplianceWizardState,
  config: ComplianceWizardConfig,
): string | null {
  const questionOrder = config.questionOrder || [
    'hhmiPolicy',
    'nihPolicy',
    'publishingStage',
    'openAccess',
    'ccLicense',
  ];

  for (const questionId of questionOrder) {
    if (state[questionId as keyof ComplianceWizardState] === null) {
      if (shouldShowQuestion(questionId, state, config)) {
        return questionId;
      }
    }
  }

  return null; // All questions answered
}

/**
 * Validates that all required questions are answered
 */
export function isWizardComplete(state: ComplianceWizardState): boolean {
  return (
    state.hhmiPolicy !== null &&
    state.nihPolicy !== null &&
    state.publishingStage !== null &&
    state.openAccess !== null &&
    (state.openAccess === 'closed' ||
      state.openAccess === 'uncertain_oa' ||
      state.ccLicense !== null)
  );
}

/**
 * Creates an initial wizard state based on config
 */
export function createInitialState(config: ComplianceWizardConfig): ComplianceWizardState {
  const initialState: ComplianceWizardState = {
    hhmiPolicy: null,
    nihPolicy: null,
    publishingStage: null,
    openAccess: null,
    ccLicense: null,
  };

  // Initialize all questions from config to null
  const questionOrder = config.questionOrder || [
    'hhmiPolicy',
    'nihPolicy',
    'publishingStage',
    'openAccess',
    'ccLicense',
  ];

  // This ensures all questions in the config are represented in the state
  // even if they're not in the hardcoded ComplianceWizardState interface
  for (const questionId of questionOrder) {
    if (!(questionId in initialState)) {
      (initialState as any)[questionId] = null;
    }
  }

  return initialState;
}
