export interface AirtableDTO {
  id: string;
  fields: Record<string, any>;
}

export interface NormalizedArticleRecord {
  id: string;
  title?: string;
  authors?: string[];
  date?: string;
  year?: string;
  pmid?: string;
  pmcid?: string;
  compliant?: boolean;
  everNonCompliant?: boolean;
  dateResolved?: string;
  linkedScientistsOrcids?: string[];
  isLinkedToPrimaryOrcid?: boolean;
  topLevelPolicy?: string;

  // Preprint-specific data
  preprint?: {
    title?: string;
    date?: string;
    year?: string;
    doi?: string;
    url?: string;
    license?: string;
    server?: string;
    complianceIssueType?: string;
    complianceIssueStatus?: string;
    authors?: string[];
    actionSteps?: string;
  };

  // Journal publication-specific data
  journal?: {
    title?: string;
    date?: string;
    year?: string;
    doi?: string;
    url?: string;
    publisher?: string;
    license?: string;
    complianceIssueType?: string;
    complianceIssueStatus?: string;
    authors?: string[];
    actionSteps?: string;
  };
}

export interface NormalizedScientist {
  id: string;
  orcid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  program: string;
  employeeId: string;
  personId: string;
  appointmentStatus: string;
  hireDate: string;
  lastReviewDate: string;
  institution: string;
  complianceRateCoveredPreprints: number;
  complianceRateCoveredPublications: number;
  preprints: {
    total: number;
    totalSubjectToPolicy: number;
    nonCompliant: number;
    resolved: number;
    originallyCompliant: number;
  };
  publications: {
    total: number;
    totalSubjectToPolicy: number;
    nonCompliant: number;
    resolved: number;
    originallyCompliant: number;
  };
}

export type ReportLoaderData = {
  orcid: string;
  scientist: NormalizedScientist | undefined;
  publications: Promise<NormalizedArticleRecord[]>;
  error?: string;
};

export type ComplianceUserMetadata = {
  hideMyReport?: boolean;
  role?: 'scientist' | 'lab-manager';
};

export type ComplianceUserMetadataSection = {
  compliance?: ComplianceUserMetadata;
};
