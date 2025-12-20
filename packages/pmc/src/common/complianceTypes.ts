// TypeScript interfaces for the compliance wizard

export interface ComplianceWizardState {
  hhmiPolicy: boolean | null;
  nihPolicy: boolean | null;
  publishingStage: string | null;
  openAccess: 'open' | 'closed' | 'uncertain_oa' | null;
  ccLicense: 'cc_by' | 'cc_other' | 'uncertain_license' | null;
}

export interface QuestionOption {
  value: string | boolean;
  label: string | React.ReactNode[];
  subLabel?: string;
  icon?: string;
  iconAlt?: string;
}

export interface WizardQuestion {
  id: string;
  title: string;
  description?: string | React.ReactNode[];
  type: 'boolean' | 'radio' | 'radio_vertical' | 'vertical';
  options: QuestionOption[];
  conditional?: string;
  wide?: boolean;
}

export interface WizardOutcome {
  id: string;
  title: string;
  type: 'advice' | 'action';
  subType?: 'success' | 'info' | 'reminder' | 'optional' | 'warning';
  text: string;
}

export interface LogicMapping {
  explicit_mappings: Record<string, string[]>;
  default: string[];
}

export interface ComplianceWizardConfig {
  questions: Record<string, WizardQuestion>;
  outcomes: Record<string, WizardOutcome>;
  logic: LogicMapping;
  questionOrder?: string[];
}

// Helper types for the logic engine
export type QuestionKey = keyof ComplianceWizardState;
export type OutcomeId = string;

// Result type for the logic engine
export interface LogicResult {
  outcomes: OutcomeId[];
}
