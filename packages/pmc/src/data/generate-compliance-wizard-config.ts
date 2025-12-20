/* eslint-disable @typescript-eslint/no-shadow */
/**
 * Compliance Wizard Configuration Generator
 *
 * Generates a TypeScript configuration file for the PMC compliance wizard
 * from CSV data files containing question mappings and outcome definitions.
 *
 * Usage: npx tsx generate-compliance-wizard-config.ts
 * Output: ../common/compliance-wizard.config.ts
 */

/* eslint-disable no-prototype-builtins */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV data files
const csvPath = path.join(__dirname, 'compliance-simplified.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const nextStepsPath = path.join(__dirname, 'compliance-next-steps.csv');
const nextStepsContent = fs.readFileSync(nextStepsPath, 'utf8');

const questionDescriptionsPath = path.join(__dirname, 'compliance-question-descriptions.csv');
const questionDescriptionsContent = fs.readFileSync(questionDescriptionsPath, 'utf8');

// Mapping from CSV values to YAML values
const valueMappings: Record<string, any> = {
  // HHMI Policy
  Yes: true,
  No: false,

  // NIH Policy
  'Yes,': true, // Note: CSV has trailing comma
  'No,': false,

  // Publishing Stage
  'I am ready to submit a preprint to a preprint server': 'preprint_ready',
  'I have a preprint that is ready for submission': 'preprint_ready', // Legacy support
  'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2025':
    'no_preprint_2025',
  'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later':
    'no_preprint_2026',
  'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2025':
    'preprint_submitted_2025',
  'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later':
    'preprint_submitted_2026',

  // Open Access
  'Yes (free to read)': 'open',
  'No (paywalled article)': 'closed',
  "I'm not sure, or I am here to receive guidance on this decision": 'uncertain_oa',

  // CC License
  'Yes (CC-BY)': 'cc_by',
  'Yes (CC BY)': 'cc_by', // Legacy support for CSV data
  'No (CC-BY-NC, CC-BY-ND, CC-BY-NC-ND, CC-BY-NC-SA, publisher-specific license)': 'cc_other',
  'No (CC BY-NC, CC BY-ND, CC BY-NC-ND, CC BY-NC-SA, publisher-specific license)': 'cc_other', // Legacy support for CSV data
  '[Question not asked]': null,

  // Note: "I'm not sure, or I am here to receive guidance on this decision" for CC License
  // will be handled contextually in the mapping logic since it's the same text as Open Access
};

// Function to normalize CC BY to CC-BY in text content
function normalizeCC(text: string): string {
  return text.replace(/CC BY/g, 'CC-BY');
}

// Function to clean invisible Unicode characters from text
function cleanUnicode(text: string): string {
  return (
    text
      // Remove zero-width non-breaking space (U+200B)
      .replace(/\u200B/g, '')
      // Remove zero-width space (U+200C)
      .replace(/\u200C/g, '')
      // Remove zero-width joiner (U+200D)
      .replace(/\u200D/g, '')
      // Remove zero-width non-joiner (U+200E)
      .replace(/\u200E/g, '')
      // Remove zero-width non-joiner (U+200F)
      .replace(/\u200F/g, '')
      // Remove narrow no-break space (U+202F)
      .replace(/\u202F/g, ' ')
      // Remove other common invisible characters
      .replace(/\uFEFF/g, '') // Zero-width no-break space (BOM)
      .replace(/\u2060/g, '') // Word joiner
      .replace(/\u2061/g, '') // Function application
      .replace(/\u2062/g, '') // Invisible times
      .replace(/\u2063/g, '') // Invisible separator
      .replace(/\u2064/g, '') // Invisible plus
      // Remove any remaining non-printable characters except newlines and tabs
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
  );
}

// Note: We handle uncertainty option parsing directly in the template generation
// rather than using a separate function, since it's a one-time hardcoded case

// Parse next steps CSV to create outcome definitions and mappings
const nextStepsRows = parseCSV(nextStepsContent);

// Custom title overrides to keep titles concise while being data-driven for text
const titleOverrides: Record<string, string> = {
  explain_that_they_can_either_contact_the_journal_to_change_license_to_ccby_or_publish_initial_and_revised_preprints:
    'Change license or publish preprints',
  no_action_needed_already_compliant: 'No action needed',
  no_action_needed_not_subject_to_either_policy: 'No action needed',
  no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend:
    'No action needed, no recommendations',
  proceed_to_biorxiv_submission: 'Submit to bioRxiv',
  optional_proceed_to_biorxiv_submission: 'Optional: Submit to bioRxiv',
  reminder_to_come_back_later_to_submit_to_pmc: 'Submit to PMC later',
  optional_reminder_to_come_back_later_to_submit_to_pmc: 'Optional: Submit to PMC later',
  proceed_to_pmc_submission: 'Submit to PMC',
  reminder_to_publish_revised_preprints: 'Publish revised preprints',
  // New outcomes added for expanded wizard
  figure_out_oa_status_and_come_back_later: 'Determine open access status',
  figure_out_license_and_come_back_later: 'Determine license choice',
  contact_the_journal_to_change_license_to_cc_by: 'Contact journal for CC BY license',
  proceed_to_pmc_submission_hhmi_and_nih: 'Proceed To PMC Submission',
  proceed_to_pmc_submission_nih: 'Proceed To PMC Submission',
};

// Parse question descriptions CSV to create question title to description mapping
const questionDescriptionsRows = parseCSV(questionDescriptionsContent);
const questionTitles: string[] = [];
const questionDescriptions: Record<string, string> = {};

for (let i = 1; i < questionDescriptionsRows.length; i++) {
  const values = questionDescriptionsRows[i];
  if (values.length < 2) continue;

  const [questionTitle, description] = values;
  if (questionTitle && questionTitle.trim()) {
    const normalizedTitle = cleanUnicode(questionTitle.trim());
    questionTitles.push(normalizedTitle);
    if (description && description.trim()) {
      questionDescriptions[normalizedTitle] = cleanUnicode(description.trim());
    }
  }
}

// Build outcome definitions and snippet mappings from next steps CSV
const outcomeDefinitions: Record<
  string,
  { id: string; title: string; type: string; subType?: string; text: string }
> = {};
const outcomeSnippets: Record<string, string> = {};

// Always add the fallback outcome for unclear cases
outcomeDefinitions['not_sure_contact_oapolicy'] = {
  id: 'not_sure_contact_oapolicy',
  title: 'Please contact the OA Support team',
  type: 'advice',
  subType: 'info',
  text: 'It is not clear how to proceed in your case, please contact the OA Support team at oapolicy@hhmi.org.',
};

for (let i = 1; i < nextStepsRows.length; i++) {
  const values = nextStepsRows[i];
  if (values.length < 2) continue;

  const [nextStep, textToDisplay] = values;

  // Create outcome ID from next step text (normalize CC BY to CC-BY and clean Unicode first)
  const normalizedNextStep = cleanUnicode(normalizeCC(nextStep));
  const outcomeId = normalizedNextStep
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Map the snippet to the outcome ID
  outcomeSnippets[normalizedNextStep] = outcomeId;

  // Create title from outcome ID, using override if available
  const title =
    titleOverrides[outcomeId] ||
    outcomeId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  // Determine action type and sub-type based on content
  const actionType = 'advice';
  let subType: string | undefined;

  if (
    textToDisplay.includes('already compliant') ||
    textToDisplay.includes('no action needed') ||
    textToDisplay.includes('No further action is needed') ||
    outcomeId === 'no_action_needed_not_subject_to_either_policy' ||
    outcomeId === 'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend'
  ) {
    subType = 'success';
  } else if (textToDisplay.includes('The next step') || textToDisplay.includes('Proceed to')) {
    // Keep as advice type since the UI component only handles 'advice' type
    // These outcomes will be rendered using DisplayAdvice component
    subType = 'info';
  } else if (textToDisplay.includes('Optional')) {
    subType = 'optional';
  } else if (textToDisplay.includes('reminder') || textToDisplay.includes('remember')) {
    subType = 'reminder';
  } else if (textToDisplay.includes('compliance options') || textToDisplay.includes('Either:')) {
    // Keep as advice without subType
  } else {
    subType = 'info';
  }

  const outcomeObject: any = {
    id: outcomeId,
    title,
    type: actionType,
    text: cleanUnicode(normalizeCC(textToDisplay)),
  };

  if (subType) {
    outcomeObject.subType = subType;
  }

  outcomeDefinitions[outcomeId] = outcomeObject;
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const contentLines = content.split('\n');

  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let lineIndex = 0;

  while (lineIndex < contentLines.length) {
    const line = contentLines[lineIndex];

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Handle escaped quotes ("")
          currentField += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (inQuotes) {
      // We're in the middle of a quoted field that spans multiple lines
      currentField += '\n';
      lineIndex++;
    } else {
      // End of row
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      lineIndex++;
    }
  }

  // Handle the last row if it wasn't completed
  if (currentRow.length > 0 || currentField.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function findOutcomesInHelpText(helpText: string): string[] {
  const foundOutcomes: string[] = [];
  const foundSnippets: string[] = [];
  const foundPositions: number[] = [];

  // Sort snippets by length (longest first) to prefer more specific matches
  const sortedSnippets = Object.entries(outcomeSnippets).sort(([a], [b]) => b.length - a.length);

  // Check each snippet against the help text (case-insensitive)
  for (const [snippet, outcome] of sortedSnippets) {
    if (helpText.toLowerCase().includes(snippet.toLowerCase())) {
      // Check if this snippet is a substring of any already found snippet
      const isSubstringOfFound = foundSnippets.some((foundSnippet) =>
        foundSnippet.toLowerCase().includes(snippet.toLowerCase()),
      );

      if (!isSubstringOfFound) {
        // Find the position of this snippet in the help text
        const position = helpText.toLowerCase().indexOf(snippet.toLowerCase());
        foundOutcomes.push(outcome);
        foundSnippets.push(snippet);
        foundPositions.push(position);
      }
    }
  }

  // If no outcomes found, default to the fallback outcome
  if (foundOutcomes.length === 0) {
    foundOutcomes.push('not_sure_contact_oapolicy');
    return foundOutcomes;
  }

  // Sort outcomes by their position in the help text to preserve original order
  const outcomesWithPositions = foundOutcomes.map((outcome, index) => ({
    outcome,
    position: foundPositions[index],
  }));

  outcomesWithPositions.sort((a, b) => a.position - b.position);

  // Extract just the outcomes in the correct order
  const orderedOutcomes = outcomesWithPositions.map((item) => item.outcome);

  // Deduplicate: if optional version exists, remove the non-optional version
  const deduplicated = [...orderedOutcomes];

  // Handle bioRxiv submission deduplication
  if (
    orderedOutcomes.includes('optional_proceed_to_biorxiv_submission') &&
    orderedOutcomes.includes('proceed_to_biorxiv_submission')
  ) {
    const index = deduplicated.indexOf('proceed_to_biorxiv_submission');
    if (index > -1) {
      deduplicated.splice(index, 1);
    }
  }

  // Handle PMC submission deduplication
  if (
    orderedOutcomes.includes('optional_reminder_to_come_back_later_to_submit_to_pmc') &&
    orderedOutcomes.includes('reminder_to_come_back_later_to_submit_to_pmc')
  ) {
    const index = deduplicated.indexOf('reminder_to_come_back_later_to_submit_to_pmc');
    if (index > -1) {
      deduplicated.splice(index, 1);
    }
  }

  // Handle "not subject to either policy" deduplication
  if (
    orderedOutcomes.includes(
      'no_action_needed_not_subject_to_either_policy_and_nothing_to_recommend',
    ) &&
    orderedOutcomes.includes('no_action_needed_not_subject_to_either_policy')
  ) {
    const index = deduplicated.indexOf('no_action_needed_not_subject_to_either_policy');
    if (index > -1) {
      deduplicated.splice(index, 1);
    }
  }

  return deduplicated;
}

// Parse all data rows and build a single object with automatic key deduplication
const explicitMappings: Record<string, string[]> = {};
const seenOutcomes = new Set<string>();

// Extract unique publishing stage options from CSV data
const publishingStageOptions = new Set<string>();

// Extract question headers from the first row of simplified CSV
const csvRows = parseCSV(csvContent);
// Use question titles from the descriptions CSV instead of CSV headers
// const questionHeaders = csvRows[0].slice(0, 5); // First 5 columns are questions

// Parse the main CSV using the improved parser
for (let i = 1; i < csvRows.length; i++) {
  const values = csvRows[i];
  if (values.length < 6) continue;

  const [hhmiPolicy, nihPolicy, publishingStage, openAccess, ccLicense, helpText] = values;

  // Collect unique publishing stage options
  publishingStageOptions.add(publishingStage);

  // Map values to YAML format with context-dependent handling for "I'm not sure" options
  const mappedValues = [
    valueMappings.hasOwnProperty(hhmiPolicy.trim()) ? valueMappings[hhmiPolicy.trim()] : hhmiPolicy,
    valueMappings.hasOwnProperty(nihPolicy.trim()) ? valueMappings[nihPolicy.trim()] : nihPolicy,
    valueMappings.hasOwnProperty(publishingStage.trim())
      ? valueMappings[publishingStage.trim()]
      : publishingStage,
    valueMappings.hasOwnProperty(openAccess.trim()) ? valueMappings[openAccess.trim()] : openAccess,
    // Handle CC License with context-dependent mapping for "I'm not sure" option
    ccLicense.trim() === "I'm not sure, or I am here to receive guidance on this decision"
      ? 'uncertain_license'
      : valueMappings.hasOwnProperty(ccLicense.trim())
        ? valueMappings[ccLicense.trim()]
        : ccLicense,
  ];

  // Handle null ccLicense (when question not asked)
  const key = mappedValues.map((v) => (v === null ? 'null' : v)).join(',');

  // Find all outcomes in the help text (normalize CC BY to CC-BY and clean Unicode)
  const normalizedHelpText = cleanUnicode(normalizeCC(helpText));
  const outcomes = findOutcomesInHelpText(normalizedHelpText);

  // Add all outcomes to the seen set
  outcomes.forEach((outcome) => {
    seenOutcomes.add(outcome);
  });

  // Merge outcomes for this key (automatic deduplication by object key)
  if (!explicitMappings[key]) {
    explicitMappings[key] = [];
  }

  // Add new outcomes that aren't already in the array
  outcomes.forEach((outcome) => {
    if (!explicitMappings[key].includes(outcome)) {
      explicitMappings[key].push(outcome);
    }
  });
}

/**
 * Get publishing stage options in a consistent order:
 * 1. "I have a preprint" option first
 * 2. Then order consistently by year (2025 before 2026)
 * 3. Within each year group, order by submission status (no preprint before already published)
 */
function getOrderedPublishingStageOptions(): string[] {
  // Convert Set to Array
  const allOptions = Array.from(publishingStageOptions);

  // Define the desired order: preprint ready first, then by year and submission status
  const desiredOrder = [
    // Preprint ready (year-agnostic) - always first
    'I am ready to submit a preprint to a preprint server',
    'I have a preprint that is ready for submission', // Legacy support

    'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2025',
    'I have not published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later',
    'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2025',
    'I have already published a preprint, and my manuscript was or will be submitted to a journal in 2026 or later',
  ];

  // Sort options according to our predefined order, with fallback for any unexpected options
  const sortedOptions = allOptions.sort((a, b) => {
    const indexA = desiredOrder.indexOf(a);
    const indexB = desiredOrder.indexOf(b);

    // If both are in our predefined order, use that order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in our predefined order, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in our predefined order, sort alphabetically as fallback
    return a.localeCompare(b);
  });

  return sortedOptions;
}

// Generate TypeScript module
const tsContent = generateTypeScriptModule(
  explicitMappings,
  outcomeDefinitions,
  publishingStageOptions,
);
const tsOutputPath = path.join(__dirname, '..', 'common', 'compliance-wizard.config.ts');
fs.writeFileSync(tsOutputPath, tsContent);

console.log('Generated compliance wizard configuration:', tsOutputPath);
console.log('Total unique mappings:', Object.keys(explicitMappings).length);
console.log(
  'Total outcomes defined:',
  Object.keys(outcomeDefinitions).length,
  '(includes fallback outcome)',
);
console.log('Publishing stage options found:', publishingStageOptions.size, '(data-driven)');
console.log('Title overrides applied:', Object.keys(titleOverrides).length);
console.log('Default outcome: not_sure_contact_oapolicy (always included)');
console.log('Outcomes found:', Array.from(seenOutcomes));

/**
 * Generate TypeScript module with the compliance wizard configuration
 */
function generateTypeScriptModule(
  explicitMappings: Record<string, string[]>,
  outcomeDefinitions: Record<string, any>,
  _publishingStageOptions: Set<string>,
): string {
  let tsContent = `// Generated compliance wizard configuration
// Generated on: ${new Date().toISOString()}
// Source files: compliance-simplified.csv, compliance-next-steps.csv
// This file is auto-generated. Do not edit manually.
// Total unique mappings: ${Object.keys(explicitMappings).length}
// Total outcomes defined: ${Object.keys(outcomeDefinitions).length} (includes fallback outcome)
// Publishing stage options found: ${_publishingStageOptions.size} (data-driven)

import type { ComplianceWizardConfig } from './complianceTypes';

export const complianceWizardConfig: ComplianceWizardConfig = {
  questions: {
    hhmiPolicy: {
      id: 'hhmiPolicy',
      title: ${JSON.stringify(questionTitles[0])},${questionDescriptions[questionTitles[0]] ? `\n      description: ${JSON.stringify(questionDescriptions[questionTitles[0]])},` : ''}
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
      ]
    },
    nihPolicy: {
      id: 'nihPolicy',
      title: ${JSON.stringify(questionTitles[1])},${questionDescriptions[questionTitles[1]] ? `\n      description: ${JSON.stringify(questionDescriptions[questionTitles[1]])},` : ''}
      type: 'boolean',
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
      ]
    },
    publishingStage: {
      id: 'publishingStage',
      title: ${JSON.stringify(questionTitles[2])},${questionDescriptions[questionTitles[2]] ? `\n      description: ${JSON.stringify(questionDescriptions[questionTitles[2]])},` : ''}
      type: 'vertical',
      options: [
`;

  // Generate publishing stage options with consistent ordering
  const stages = getOrderedPublishingStageOptions();
  for (const stage of stages) {
    const value = valueMappings[stage] || stage;
    const cleanStage = cleanUnicode(stage);
    tsContent += `        { value: '${value}', label: '${cleanStage}' },\n`;
  }

  tsContent += `      ]
    },
    openAccess: {
      id: 'openAccess',
      title: ${JSON.stringify(questionTitles[3])},${questionDescriptions[questionTitles[3]] ? `\n      description: ${JSON.stringify(questionDescriptions[questionTitles[3]])},` : ''}
      type: 'radio',
      options: [
        { value: 'open', label: 'Yes (free to read)', icon: 'open-access', iconAlt: 'Open Access' },
        { value: 'closed', label: 'No (paywalled article)', icon: 'closed-access', iconAlt: 'Closed Access' },
        { value: 'uncertain_oa', label: "I'm not sure", subLabel: "or I am here to receive guidance on this decision" }
      ]
    },
    ccLicense: {
      id: 'ccLicense',
      title: ${JSON.stringify(questionTitles[4])},${questionDescriptions[questionTitles[4]] ? `\n      description: ${JSON.stringify(questionDescriptions[questionTitles[4]])},` : ''}
      type: 'radio',
      wide: true,
      conditional: "openAccess == 'open'",
      options: [
        { value: 'cc_by', label: 'Yes (CC-BY)', icon: 'cc-by', iconAlt: 'CC-BY License' },
        { value: 'cc_other', label: 'No (other license)', icon: 'cc-other', iconAlt: 'Other License' },
        { value: 'uncertain_license', label: "I'm not sure", subLabel: "or I am here to receive guidance on this decision" }
      ]
    }
  },
  questionOrder: ['hhmiPolicy', 'nihPolicy', 'publishingStage', 'openAccess', 'ccLicense'],
  outcomes: {
`;

  // Generate outcomes
  for (const [id, outcome] of Object.entries(outcomeDefinitions)) {
    tsContent += `    ${id}: {\n`;
    tsContent += `      id: '${id}',\n`;
    tsContent += `      title: '${(outcome as any).title.replace(/ccby/i, 'CC-BY')}',\n`;
    tsContent += `      type: '${(outcome as any).type}',\n`;
    if ((outcome as any).subType) {
      tsContent += `      subType: '${(outcome as any).subType}',\n`;
    }
    tsContent += `      text: \`${(outcome as any).text}\`\n`;
    tsContent += `    },\n`;
  }

  tsContent += `  },
  logic: {
    default: ['not_sure_contact_oapolicy'],
    explicit_mappings: {
`;

  // Generate explicit mappings
  for (const [key, outcomes] of Object.entries(explicitMappings)) {
    const outcomeList = outcomes.map((o) => `'${o}'`).join(', ');
    tsContent += `      '${key}': [${outcomeList}],\n`;
  }

  tsContent += `    }
  }
};
`;

  return tsContent;
}
