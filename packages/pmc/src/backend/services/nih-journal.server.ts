import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';

// Types for NIH journal data
export interface NIHJournal {
  id: number;
  journalTitle: string;
  nlmta: string;
  pissn?: string;
  eissn?: string;
  startDate: string;
  endDate?: string;
}

export interface NIHJournalList {
  source: string;
  date: string;
  items: NIHJournal[];
}

export interface NIHValidationResult {
  isValid: boolean;
  issn?: string;
  issnType?: 'print' | 'electronic';
  journalMatch?: NIHJournal;
  error?: string;
}

// Cache for the NIH journal list to avoid repeated file reads
let nihJournalListCache: NIHJournalList | null = null;
let nihJournalListCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for the Fuse.js instance to avoid recreating it
let fuseInstance: Fuse<NIHJournal> | null = null;

/**
 * Fuse.js configuration for journal search
 * Conservative settings for high-quality matches
 */
const FUSE_CONFIG: IFuseOptions<NIHJournal> = {
  keys: [
    { name: 'journalTitle', weight: 0.8 }, // Most important - full journal title
    { name: 'nlmta', weight: 0.6 }, // NLM Title Abbreviation
    { name: 'pissn', weight: 0.3 }, // Print ISSN
    { name: 'eissn', weight: 0.3 }, // Electronic ISSN
  ],
  threshold: 0.3, // Conservative threshold for high-quality matches
  distance: 200, // Allow for longer journal names
  includeScore: true, // Include score for debugging/optimization
  shouldSort: true, // Sort by relevance score
  minMatchCharLength: 2, // Don't match single characters
  ignoreLocation: true, // Match anywhere in string
  findAllMatches: true, // Get all possible matches
  useExtendedSearch: false, // Don't use extended search syntax
};

/**
 * Sanitize and normalize search input
 * @param input - Raw search input
 * @returns Sanitized and normalized search string
 */
function sanitizeSearchInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Allow: word chars, spaces, hyphens, and : ; ( ) , . &
  return input
    .trim()
    .replace(/[^\w\s\-:;(),.&]/g, '') // Remove all except allowed
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .substring(0, 100); // Limit length
}

/**
 * Initialize or get cached Fuse.js instance
 */
function getFuseInstance(journals: NIHJournal[]): Fuse<NIHJournal> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(journals, FUSE_CONFIG);
  }
  return fuseInstance;
}

/**
 * Load the NIH journal list from the JSON file
 * Uses caching to improve performance
 */
async function loadNIHJournalList(): Promise<NIHJournalList> {
  const now = Date.now();

  // Return cached data if still valid
  if (nihJournalListCache && now - nihJournalListCacheTime < CACHE_DURATION) {
    return nihJournalListCache;
  }

  try {
    // Import the JSON file dynamically
    const nihJournalList = await import('../../data/J_Entrez.json');

    // Update cache
    nihJournalListCache = nihJournalList.default as NIHJournalList;
    nihJournalListCacheTime = now;

    // Reset Fuse instance when data changes
    fuseInstance = null;

    return nihJournalListCache;
  } catch (error) {
    console.error('Failed to load NIH journal list:', error);
    throw new Error('Failed to load NIH Public Access journal list');
  }
}

/**
 * Validate a journal against the NIH Public Access journal list
 * Implements ISSN type preference: eissn > pissn > linking
 */
export async function validateJournalAgainstNIH(
  journalName: string,
  issn?: string,
): Promise<NIHValidationResult> {
  try {
    // Sanitize inputs
    const sanitizedJournalName = sanitizeSearchInput(journalName);
    const sanitizedIssn = issn ? issn.replace(/[-\s]/g, '') : undefined;

    if (!sanitizedJournalName && !sanitizedIssn) {
      return {
        isValid: false,
        error: 'Journal name or ISSN is required for validation',
      };
    }

    const nihJournals = await loadNIHJournalList();

    // Match by journal name first (case-insensitive)
    let match = sanitizedJournalName
      ? nihJournals.items.find(
          (journal) => journal.journalTitle.toLowerCase() === sanitizedJournalName.toLowerCase(),
        )
      : null;

    // If no match by name and we have ISSN, try ISSN matching
    if (!match && sanitizedIssn) {
      match = nihJournals.items.find((journal) => {
        const journalPissn = journal.pissn?.replace(/[-\s]/g, '');
        const journalEissn = journal.eissn?.replace(/[-\s]/g, '');
        return journalPissn === sanitizedIssn || journalEissn === sanitizedIssn;
      });
    }

    if (match) {
      // Determine ISSN type preference: electronic > print
      let validatedIssn: string | null = null;
      let validatedIssnType: 'print' | 'electronic' | null = null;

      if (match.eissn) {
        validatedIssn = match.eissn;
        validatedIssnType = 'electronic';
      } else if (match.pissn) {
        validatedIssn = match.pissn;
        validatedIssnType = 'print';
      }

      return {
        isValid: true,
        issn: validatedIssn || undefined,
        issnType: validatedIssnType || undefined,
        journalMatch: match,
      };
    }

    return {
      isValid: false,
      error: `Journal "${journalName}" is not found in the NIH Public Access journal list. The journal your manuscript was submitted to must be on the approved list.`,
    };
  } catch (error) {
    console.error('NIH journal validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate journal against NIH Public Access list. Please try again.',
    };
  }
}

/**
 * Search journals in the NIH Public Access list using Fuse.js fuzzy search
 * Returns filtered results for ComboBox autocomplete
 */
export async function searchNIHJournals(query: string, limit: number = 20): Promise<NIHJournal[]> {
  try {
    // Sanitize search query
    const sanitizedQuery = sanitizeSearchInput(query);

    if (!sanitizedQuery) {
      return [];
    }

    // Validate limit parameter
    const safeLimit = Math.min(Math.max(1, limit), 100); // Ensure limit is between 1 and 100

    const nihJournals = await loadNIHJournalList();
    const fuse = getFuseInstance(nihJournals.items);

    // Perform fuzzy search with Fuse.js
    const results = fuse.search(sanitizedQuery);

    // Return top results with original data structure
    return results.slice(0, safeLimit).map((result) => result.item);
  } catch (error) {
    console.error('NIH journal search error:', error);
    return [];
  }
}

/**
 * Get a specific journal by ID from the NIH list
 */
export async function getNIHJournalById(id: number): Promise<NIHJournal | null> {
  try {
    // Validate ID parameter
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    const nihJournals = await loadNIHJournalList();
    return nihJournals.items.find((journal) => journal.id === id) || null;
  } catch (error) {
    console.error('Failed to get NIH journal by ID:', error);
    return null;
  }
}
