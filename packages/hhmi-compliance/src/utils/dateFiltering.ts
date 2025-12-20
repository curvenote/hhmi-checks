import type { NormalizedArticleRecord, NormalizedScientist } from '../backend/types.js';

/**
 * Parses a date string and returns a Date object, or null if invalid.
 * Handles ISO format (YYYY-MM-DD) and other common formats gracefully.
 */
function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }

  try {
    const parsed = new Date(dateString);
    // Check if date is valid
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Calculates the threshold date from a scientist's hire date or Jan 1, 2022.
 * Returns the later of the hire date or Jan 1, 2022.
 * If no hire date is available, defaults to Jan 1, 2022.
 */
function getThresholdDate(scientist: NormalizedScientist | undefined): Date {
  // Baseline date: Jan 1, 2022
  const baselineDate = new Date('2022-01-01');

  if (!scientist) {
    return baselineDate;
  }

  const hireDate = parseDate(scientist.hireDate);

  // If no hire date is available, use the baseline
  if (!hireDate) {
    return baselineDate;
  }

  // Return the later of hire date or baseline date
  return hireDate > baselineDate ? hireDate : baselineDate;
}

/**
 * Filters articles to only include those with dates on or after the threshold date.
 * Articles without dates are included (per requirements).
 */
export function filterArticlesByDate(
  articles: NormalizedArticleRecord[],
  scientist: NormalizedScientist | undefined,
): NormalizedArticleRecord[] {
  const thresholdDate = getThresholdDate(scientist);

  return articles.filter((article) => {
    // Include articles without dates (per requirements)
    if (!article.date) {
      return true;
    }

    const articleDate = parseDate(article.date);
    // If date is invalid, include it (safer approach)
    if (!articleDate) {
      return true;
    }

    // Include articles on or after the threshold date
    return articleDate >= thresholdDate;
  });
}
