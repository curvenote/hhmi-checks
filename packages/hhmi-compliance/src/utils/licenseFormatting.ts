/**
 * Formats license strings for consistent display throughout the HHMI compliance module.
 *
 * This function standardizes how Creative Commons licenses are displayed to users:
 * - Input format from data: "cc-by", "cc-by-nc", "cc-by-nc-nd", etc. (with hyphens throughout)
 * - Output format for display: "CC BY", "CC BY-NC", "CC BY-NC-ND", etc. (space after CC, hyphens between restrictions)
 *
 * Rules:
 * - "CC" is always capitalized and followed by a space
 * - The restrictions part (BY, NC, ND, SA) uses hyphens as separators
 * - Handles various input formats (lowercase, uppercase, mixed case)
 * - Preserves unknown/unrecognized licenses as-is (but uppercased)
 *
 * @param license - The license string from the data source
 * @returns Formatted license string for display
 *
 * @example
 * formatLicenseForDisplay("cc-by") // Returns: "CC BY"
 * formatLicenseForDisplay("cc-by-nc") // Returns: "CC BY-NC"
 * formatLicenseForDisplay("cc-by-nc-nd") // Returns: "CC BY-NC-ND"
 * formatLicenseForDisplay("cc-by-sa") // Returns: "CC BY-SA"
 * formatLicenseForDisplay("CC-BY") // Returns: "CC BY"
 * formatLicenseForDisplay("other-license") // Returns: "OTHER-LICENSE"
 */
export function formatLicenseForDisplay(license: string | undefined): string | undefined {
  if (!license) return undefined;

  const trimmedLicense = license.trim();
  if (trimmedLicense === '') return undefined;

  // Convert to lowercase for consistent processing
  const lowerLicense = trimmedLicense.toLowerCase();

  // Check if it's a Creative Commons license (starts with "cc")
  if (lowerLicense.startsWith('cc-') || lowerLicense === 'cc') {
    // Split on hyphens
    const parts = lowerLicense.split('-');

    if (parts.length === 1) {
      // Just "cc" without any restrictions
      return 'CC';
    }

    // First part should be "cc"
    if (parts[0] === 'cc') {
      // Uppercase all restriction parts (BY, NC, ND, SA)
      const restrictions = parts
        .slice(1)
        .map((part) => part.toUpperCase())
        .join('-');

      // Return "CC " followed by the restrictions with hyphens
      return `CC ${restrictions}`;
    }
  }

  // For non-CC licenses, return uppercase version
  return trimmedLicense.toUpperCase();
}

/**
 * Checks if a license is Creative Commons BY (the compliant license for HHMI).
 * Handles various formats of the input string.
 *
 * @param license - The license string to check
 * @returns true if the license is CC BY, false otherwise
 *
 * @example
 * isCCBY("cc-by") // Returns: true
 * isCCBY("CC-BY") // Returns: true
 * isCCBY("cc-by-nc") // Returns: false
 */
export function isCCBY(license: string | undefined): boolean {
  if (!license) return false;
  const normalized = license.trim().toLowerCase();
  return normalized === 'cc-by';
}
