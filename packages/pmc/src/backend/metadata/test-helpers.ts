/**
 * Test helper functions for PMC metadata validation
 * These functions are used for testing different validation scenarios
 * without making actual API calls to external services.
 */

import { data as dataResponse } from 'react-router';
import { validateJournalAgainstNIH } from '../services/nih-journal.server.js';

/**
 * Test mode DOI validation helper
 * Use these test DOIs to simulate different error conditions without making API calls:
 * - 10.1000/test-missing-title: Simulates missing article title
 * - 10.1000/test-missing-journal: Simulates missing journal title
 * - 10.1000/test-missing-issn: Simulates missing ISSN information
 * - 10.1000/test-invalid-journal: Simulates journal not in NIH Public Access list
 * - 10.1000/test-doi-journal-not-in-nih: Simulates a valid DOI lookup where the journal is not in the NIH list
 */
export function handleTestModeDOI(doi: string) {
  switch (doi) {
    case '10.1000/test-missing-title':
      return dataResponse(
        {
          error: {
            type: 'general',
            message: 'DOI found but article title is missing.',
          },
        },
        { status: 422 },
      );

    case '10.1000/test-missing-journal':
      return dataResponse(
        {
          error: {
            type: 'general',
            message: 'DOI found but journal title is missing. Please enter journal name manually.',
          },
        },
        { status: 422 },
      );

    case '10.1000/test-missing-issn':
      return dataResponse(
        {
          error: {
            type: 'general',
            message:
              'DOI found but ISSN information is missing. ISSN is required for PMC deposits.',
          },
        },
        { status: 422 },
      );

    case '10.1000/test-invalid-journal':
      return dataResponse(
        {
          error: {
            type: 'general',
            message: 'Journal not found in NIH Public Access list',
          },
        },
        { status: 422 },
      );

    case '10.1000/test-doi-journal-not-in-nih':
      return handleTestDOINotInNIH();

    default:
      return null; // Not a test DOI, proceed with normal processing
  }
}

/**
 * Handle the test case where a valid DOI lookup returns a journal not in the NIH list
 */
async function handleTestDOINotInNIH() {
  // Simulate a valid Crossref response, but with a journal not in NIH
  const item = {
    title: 'Test Article',
    'container-title': 'Not In NIH Journal',
    ISSN: ['1234-5678'],
    author: [{ given: 'Test', family: 'Author' }],
    type: 'journal-article',
    volume: '1',
    issue: '1',
    page: '1-10',
    URL: 'https://doi.org/10.1000/test-doi-journal-not-in-nih',
    published: { 'date-parts': [[2024, 1, 1]] },
    publisher: 'Test Publisher',
    source: 'Crossref',
    'short-container-title': 'NINJ',
  };

  // Let the normal NIH validation logic run (should fail)
  const nihValidation = await validateJournalAgainstNIH(item['container-title'], item.ISSN[0]);

  if (!nihValidation.isValid) {
    return dataResponse(
      {
        error: {
          type: 'general',
          message: nihValidation.error || 'Journal not found in NIH Public Access list',
        },
      },
      { status: 422 },
    );
  }

  // If for some reason it passes, return the test data (should not happen in test)
  return {
    success: true,
    item,
    nihValidation,
  };
}

/**
 * Check if a DOI is a test mode DOI
 */
export function isTestModeDOI(doi: string): boolean {
  return doi.startsWith('10.1000/test-');
}
