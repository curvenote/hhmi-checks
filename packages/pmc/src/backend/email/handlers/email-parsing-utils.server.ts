/**
 * Shared utility functions for parsing email content
 * These functions can be used across different email handlers
 */

/**
 * Extracts manuscript ID from text using regex patterns
 * Looks for patterns like "Manuscript ID xxxxx" or "for Manuscript ID xxxxx"
 * Also handles NIHMS-prefixed IDs
 */
export function extractManuscriptId(text: string): string | null {
  // Pattern 1: Look for "NIHMS" followed by digits (e.g., "NIHMS12345")
  const nihmsPattern = /NIHMS\s*(\d+)/i;
  const nihmsMatch = text.match(nihmsPattern);
  if (nihmsMatch) {
    return nihmsMatch[1];
  }

  // Pattern 2: Look for "Manuscript ID xxxxx" or "for Manuscript ID xxxxx"
  // Manuscript IDs can be numeric or alphanumeric
  // Handle various whitespace characters: spaces, tabs, newlines, carriage returns
  const patterns = [
    /Manuscript[\s\t\n\r]+ID[\s\t\n\r]+([a-zA-Z0-9]+)/i,
    /for[\s\t\n\r]+Manuscript[\s\t\n\r]+ID[\s\t\n\r]+([a-zA-Z0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts NIHMS manuscript ID from email content looking for (NIHMS2109555) pattern
 * Returns the full "NIHMS12345" format
 */
// export function extractNIHMSManuscriptId(content: string): string | null {
//   // Look for pattern like (NIHMS2109555) in the content
//   const nihmsPattern = /\(NIHMS(\d+)\)/i;
//   const match = content.match(nihmsPattern);
//   return match ? `NIHMS${match[1]}` : null;
// }
