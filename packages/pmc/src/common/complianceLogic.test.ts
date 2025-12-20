// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  computeOutcome,
  shouldShowQuestion,
  isWizardComplete,
  generateStateKey,
} from './complianceLogic.js';
import type { ComplianceWizardConfig, ComplianceWizardState } from './complianceTypes.js';

const mockConfig: ComplianceWizardConfig = {
  questions: {
    hhmiPolicy: {
      id: 'hhmiPolicy',
      title: 'HHMI Policy',
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
    },
    nihPolicy: {
      id: 'nihPolicy',
      title: 'NIH Policy',
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
    },
    publishingStage: {
      id: 'publishingStage',
      title: 'Publishing Stage',
      type: 'radio',
      options: [
        { value: 'preprint_ready', label: 'Preprint Ready' },
        { value: 'no_preprint_2025', label: 'No Preprint 2025' },
      ],
    },
    openAccess: {
      id: 'openAccess',
      title: 'Open Access',
      type: 'radio',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
      ],
    },
    ccLicense: {
      id: 'ccLicense',
      title: 'CC License',
      type: 'radio',
      conditional: "openAccess == 'open'",
      options: [
        { value: 'cc_by', label: 'CC BY' },
        { value: 'cc_other', label: 'Other' },
      ],
    },
  },
  outcomes: {
    outcome1: {
      id: 'outcome1',
      title: 'Outcome 1',
      type: 'advice',
      subType: 'info',
      text: 'Info',
    },
    outcome2: {
      id: 'outcome2',
      title: 'Outcome 2',
      type: 'advice',
      subType: 'success',
      text: 'Success',
    },
  },
  logic: {
    explicit_mappings: {
      'true,false,preprint_ready,open,cc_by': ['outcome1'],
      'false,true,no_preprint_2025,closed,null': ['outcome2'],
    },
    default: ['outcome1'],
  },
  questionOrder: ['hhmiPolicy', 'nihPolicy', 'publishingStage', 'openAccess', 'ccLicense'],
};

describe('compliance-logic', () => {
  describe('createInitialState', () => {
    it('should create initial state with null values', () => {
      const state = createInitialState(mockConfig);
      expect(state).toEqual({
        hhmiPolicy: null,
        nihPolicy: null,
        publishingStage: null,
        openAccess: null,
        ccLicense: null,
      });
    });
  });

  describe('generateStateKey', () => {
    it('should generate correct state key', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'open',
        ccLicense: 'cc_by',
      };
      const key = generateStateKey(state);
      expect(key).toBe('true,false,preprint_ready,open,cc_by');
    });

    it('should handle null ccLicense', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: false,
        nihPolicy: true,
        publishingStage: 'no_preprint_2025',
        openAccess: 'closed',
        ccLicense: null,
      };
      const key = generateStateKey(state);
      expect(key).toBe('false,true,no_preprint_2025,closed,null');
    });
  });

  describe('computeOutcome', () => {
    it('should return matching outcome', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'open',
        ccLicense: 'cc_by',
      };
      const result = computeOutcome(state, mockConfig);
      expect(result.outcomes).toEqual(['outcome1']);
    });

    it('should return default outcome when no match', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: false,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'open',
        ccLicense: 'cc_other',
      };
      const result = computeOutcome(state, mockConfig);
      expect(result.outcomes).toEqual(['outcome1']);
    });
  });

  describe('shouldShowQuestion', () => {
    it('should show question without conditional', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: null,
        nihPolicy: null,
        publishingStage: null,
        openAccess: null,
        ccLicense: null,
      };
      const result = shouldShowQuestion('hhmiPolicy', state, mockConfig);
      expect(result).toBe(true);
    });

    it('should show ccLicense when openAccess is open', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'open',
        ccLicense: null,
      };
      const result = shouldShowQuestion('ccLicense', state, mockConfig);
      expect(result).toBe(true);
    });

    it('should not show ccLicense when openAccess is closed', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'closed',
        ccLicense: null,
      };
      const result = shouldShowQuestion('ccLicense', state, mockConfig);
      expect(result).toBe(false);
    });
  });

  describe('isWizardComplete', () => {
    it('should return false when questions are unanswered', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: null,
        nihPolicy: null,
        publishingStage: null,
        openAccess: null,
        ccLicense: null,
      };
      const result = isWizardComplete(state);
      expect(result).toBe(false);
    });

    it('should return true when all required questions are answered', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'open',
        ccLicense: 'cc_by',
      };
      const result = isWizardComplete(state);
      expect(result).toBe(true);
    });

    it('should return true when openAccess is closed (no ccLicense needed)', () => {
      const state: ComplianceWizardState = {
        hhmiPolicy: true,
        nihPolicy: false,
        publishingStage: 'preprint_ready',
        openAccess: 'closed',
        ccLicense: null,
      };
      const result = isWizardComplete(state);
      expect(result).toBe(true);
    });
  });
});
