import type { WizardLogic } from '@curvenote/scms-core';
import type { ComplianceWizardState, ComplianceWizardConfig } from './complianceTypes.js';
import {
  createInitialState,
  shouldShowQuestion,
  isWizardComplete,
  computeOutcome,
} from './complianceLogic.js';

/**
 * Compliance-specific wizard logic implementation
 *
 * Adapts the existing compliance logic functions to work with the generic Wizard component.
 */
export function createComplianceWizardLogic(
  config: ComplianceWizardConfig,
): WizardLogic<ComplianceWizardState> {
  return {
    createInitialState: () => createInitialState(config),

    shouldShowQuestion: (questionId: string, state: ComplianceWizardState) =>
      shouldShowQuestion(questionId, state, config),

    isComplete: (state: ComplianceWizardState) => isWizardComplete(state),

    computeOutcome: (state: ComplianceWizardState) => computeOutcome(state, config),

    handleStateChange: (questionId: string, value: any, prevState: ComplianceWizardState) => {
      const changes: Partial<ComplianceWizardState> = {};

      // Handle conditional question clearing for openAccess changes
      if (questionId === 'openAccess') {
        const prevOpenAccess = prevState.openAccess;
        const newOpenAccess = value as 'open' | 'closed' | 'uncertain_oa';

        // Clear ccLicense when openAccess changes in ways that affect its visibility
        if (
          (prevOpenAccess === 'open' &&
            (newOpenAccess === 'closed' || newOpenAccess === 'uncertain_oa')) ||
          ((prevOpenAccess === 'closed' || prevOpenAccess === 'uncertain_oa') &&
            newOpenAccess === 'open')
        ) {
          changes.ccLicense = null;
        }
      }

      return changes;
    },

    getFirstQuestion: () => 'hhmiPolicy',
  };
}
