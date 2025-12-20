import { AIRTABLE_CONFIG } from './airtableConfig.js';
import type { AirtableDTO, NormalizedArticleRecord } from './types.js';
import {
  cleanLicenseString,
  cleanString,
  extractORCIDs,
  fetchFilterAndNormalizeRecords,
  getBoolean,
  splitAuthorsField,
} from './airtable.common.server.js';

// Field name helpers for cleaner code
const PREPRINT_FIELDS = AIRTABLE_CONFIG.tables.preprints.fields;

export function normalizePreprintRecordToArticleRecord(
  responseData: AirtableDTO,
  orcid: string,
): NormalizedArticleRecord {
  const fields = responseData.fields;

  const preprintAuthors = splitAuthorsField(fields[PREPRINT_FIELDS.author_list_standardized.id]);
  const publicationAuthors = splitAuthorsField(fields[PREPRINT_FIELDS.publication_authors.id]);

  const authors = preprintAuthors ?? publicationAuthors;

  const preprintDate = cleanString(fields[PREPRINT_FIELDS.date.id]);
  const preprintYear = cleanString(fields[PREPRINT_FIELDS.year.id]);
  const publicationDate = cleanString(fields[PREPRINT_FIELDS.publication_date.id]);

  // Parse publication year from date if available
  let publicationYear: string | undefined;
  if (publicationDate) {
    const parsedDate = new Date(publicationDate);
    if (!isNaN(parsedDate.getTime())) {
      publicationYear = parsedDate.getFullYear().toString();
    }
  }

  // Only use publication date/year if publicationYear was successfully parsed
  // This ensures date and year come from the same source
  const topLevelDate = publicationYear ? publicationDate : preprintDate;
  const topLevelYear = publicationYear ?? preprintYear;
  const linkedPublication = cleanString(fields[PREPRINT_FIELDS.linked_publication.id]);

  const linkedScientists = cleanString(fields[PREPRINT_FIELDS.linked_scientists.id]);
  const linkedScientistsOrcids = extractORCIDs(linkedScientists);

  return {
    id: responseData.id,
    title: cleanString(fields[PREPRINT_FIELDS.top_level_title.id]),
    authors,
    date: cleanString(topLevelDate),
    year: cleanString(topLevelYear),
    pmid: cleanString(fields[PREPRINT_FIELDS.pmid.id]),
    pmcid: cleanString(fields[PREPRINT_FIELDS.pmcid.id]),
    compliant: getBoolean(fields[PREPRINT_FIELDS.top_level_compliance.id]),
    everNonCompliant: getBoolean(fields[PREPRINT_FIELDS.ever_non_compliant.id]),
    dateResolved: cleanString(fields[PREPRINT_FIELDS.date_resolved_for_interface.id]),
    linkedScientistsOrcids,
    isLinkedToPrimaryOrcid: linkedScientistsOrcids.includes(orcid),
    topLevelPolicy: cleanString(fields[PREPRINT_FIELDS.top_level_policy.id]),
    preprint: {
      title: cleanString(fields[PREPRINT_FIELDS.title.id]),
      date: preprintDate,
      year: preprintYear,
      doi: cleanString(fields[PREPRINT_FIELDS.doi.id]),
      url: cleanString(fields[PREPRINT_FIELDS.url.id]),
      license: cleanLicenseString(fields[PREPRINT_FIELDS.license.id]),
      server: cleanString(fields[PREPRINT_FIELDS.server.id]),
      complianceIssueType: cleanString(fields[PREPRINT_FIELDS.issue_type.id]),
      complianceIssueStatus: cleanString(fields[PREPRINT_FIELDS.status.id]),
      authors: preprintAuthors,
      actionSteps: cleanString(fields[PREPRINT_FIELDS.action_steps.id]),
    },
    journal: linkedPublication
      ? {
          title: cleanString(fields[PREPRINT_FIELDS.publication_title.id]),
          date: publicationDate,
          year: publicationYear,
          doi: cleanString(fields[PREPRINT_FIELDS.published_doi.id]),
          url: cleanString(fields[PREPRINT_FIELDS.publication_url.id]),
          publisher: cleanString(fields[PREPRINT_FIELDS.publisher.id]),
          license: cleanLicenseString(fields[PREPRINT_FIELDS.publication_license.id]),
          complianceIssueType: cleanString(fields[PREPRINT_FIELDS.publication_issue_type.id]),
          complianceIssueStatus: cleanString(fields[PREPRINT_FIELDS.publication_status.id]),
          authors: publicationAuthors,
          actionSteps: cleanString(fields[PREPRINT_FIELDS.publication_action_steps.id]),
        }
      : undefined,
  } satisfies NormalizedArticleRecord;
}

export async function fetchPreprintsCoveredByPolicy(
  orcid: string,
): Promise<NormalizedArticleRecord[]> {
  const escapedOrcid = orcid.trim().replace(/'/g, "\\'");
  const filterFormula = `AND(
    OR(
      FIND('${escapedOrcid}', {${PREPRINT_FIELDS.authorships_author_orcid.id}}) > 0,
      FIND('${escapedOrcid}', {${PREPRINT_FIELDS.linked_scientists.id}}) > 0
    ),
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Meeting abstract (not paper)',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Data/code (not paper)',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Review, commentary, etc.',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Not HHMI lab head',
    {${PREPRINT_FIELDS.top_level_covered.id}}
  )`;

  const records = await fetchFilterAndNormalizeRecords(
    AIRTABLE_CONFIG.tables.preprints.id,
    orcid,
    filterFormula,
    normalizePreprintRecordToArticleRecord,
    { cellFormat: 'string' }, // Return linked record names instead of IDs
  );
  return records;
}

export async function fetchPreprintsNotCoveredByPolicy(
  orcid: string,
): Promise<NormalizedArticleRecord[]> {
  const escapedOrcid = orcid.trim().replace(/'/g, "\\'");
  const filterFormula = `AND(
    OR(
      FIND('${escapedOrcid}', {${PREPRINT_FIELDS.authorships_author_orcid.id}}) > 0,
      FIND('${escapedOrcid}', {${PREPRINT_FIELDS.linked_scientists.id}}) > 0
    ),
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Meeting abstract (not paper)',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Data/code (not paper)',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Review, commentary, etc.',
    {${PREPRINT_FIELDS.not_subject_to_policy_reason.id}} != 'Not HHMI lab head',
    NOT({${PREPRINT_FIELDS.top_level_covered.id}})
  )`;

  const records = await fetchFilterAndNormalizeRecords(
    AIRTABLE_CONFIG.tables.preprints.id,
    orcid,
    filterFormula,
    normalizePreprintRecordToArticleRecord,
    { cellFormat: 'string' }, // Return linked record names instead of IDs
  );
  return records;
}
