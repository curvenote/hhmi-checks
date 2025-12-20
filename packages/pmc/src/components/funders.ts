import type { FunderKey } from '../common/metadata.schema.js';

export type Funder = {
  name: string;
  abbreviation: string;
  key: FunderKey;
};

export const PMC_FUNDERS_MAP: Record<FunderKey, Funder> = {
  nih: {
    name: 'National Institutes of Health',
    abbreviation: 'NIH',
    key: 'nih',
  },
  acl: {
    name: 'Administration for Community Living',
    abbreviation: 'ACL',
    key: 'acl',
  },
  ahrq: {
    name: 'Agency for Healthcare Research and Quality',
    abbreviation: 'AHRQ',
    key: 'ahrq',
  },
  cdc: {
    name: 'Centers for Disease Control and Prevention',
    abbreviation: 'CDC',
    key: 'cdc',
  },
  fda: {
    name: 'Food and Drug Administration',
    abbreviation: 'FDA',
    key: 'fda',
  },
  aspr: {
    name: 'Administration for Strategic Preparedness & Response',
    abbreviation: 'ASPR',
    key: 'aspr',
  },
  epa: {
    name: 'Environmental Protection Agency',
    abbreviation: 'EPA',
    key: 'epa',
  },
  nist: {
    name: 'National Institute of Standards and Technology',
    abbreviation: 'NIST',
    key: 'nist',
  },
  dhs: {
    name: 'Department of Homeland Security',
    abbreviation: 'DHS',
    key: 'dhs',
  },
  va: {
    name: 'Department of Veterans Affairs',
    abbreviation: 'VA',
    key: 'va',
  },
  hhmi: {
    name: 'Howard Hughes Medical Institute',
    abbreviation: 'HHMI',
    key: 'hhmi',
  },
};
