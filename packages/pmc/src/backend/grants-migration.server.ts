import { uuidv7 } from 'uuidv7';
import type { GrantEntry, FunderKey, PMCWorkVersionMetadata } from '../common/metadata.schema.js';
import {
  hasValidHhmiGrant as hasValidHhmiGrantFromValidation,
  validateMigrationResult as validateMigrationResultFromValidation,
} from '../common/validation.js';

/**
 * PMC Grants Migration Utilities
 *
 * Provides lazy migration functionality to convert existing funders array
 * to the new grants structure while maintaining backward compatibility.
 */

// ==============================
// Type Definitions
// ==============================

export interface MigrationResult {
  needsMigration: boolean;
  grants?: GrantEntry[];
  migrationApplied?: boolean;
}

export interface PMCMetadataWithMigration extends PMCWorkVersionMetadata {
  grants?: GrantEntry[];
  funders?: FunderKey[];
}

// ==============================
// Migration Detection
// ==============================

/**
 * Detect if PMC metadata needs migration from funders to grants
 *
 * @param metadata - PMC metadata to check
 * @returns true if migration is needed, false otherwise
 */
export function needsMigration(metadata: PMCMetadataWithMigration | null | undefined): boolean {
  if (!metadata) return false;

  // If grants already exist, no migration needed
  if (metadata.grants && metadata.grants.length > 0) {
    return false;
  }

  // If funders exist but grants don't, migration is needed
  if (metadata.funders && metadata.funders.length > 0) {
    return true;
  }

  // No funding information present, no migration needed
  return false;
}

/**
 * Check if metadata has the old funders structure only
 */
export function hasLegacyFundersOnly(
  metadata: PMCMetadataWithMigration | null | undefined,
): boolean {
  if (!metadata) return false;

  return (
    (!metadata.grants || metadata.grants.length === 0) &&
    !!metadata.funders &&
    metadata.funders.length > 0
  );
}

/**
 * Check if metadata has the new grants structure
 */
export function hasGrantsStructure(metadata: PMCMetadataWithMigration | null | undefined): boolean {
  if (!metadata) return false;

  return !!metadata.grants && metadata.grants.length > 0;
}

// ==============================
// Migration Functions
// ==============================

/**
 * Convert funders array to grants array with empty grant IDs
 *
 * @param funders - Array of funder keys to convert
 * @returns Array of grant entries with empty grant IDs
 */
export function migrateFundersToGrants(funders: FunderKey[]): GrantEntry[] {
  return funders.map((funderKey) => ({
    id: uuidv7(),
    funderKey,
    grantId: '', // Empty grant ID - will need to be filled by user
  }));
}

/**
 * Apply migration to PMC metadata, preserving original funders for safety
 *
 * @param metadata - Original PMC metadata
 * @returns Updated metadata with grants structure
 */
export function applyMigration(metadata: PMCMetadataWithMigration): PMCMetadataWithMigration {
  if (!needsMigration(metadata)) {
    return metadata;
  }

  const grants = migrateFundersToGrants(metadata.funders!);

  return {
    ...metadata,
    grants,
    // Keep funders for backward compatibility during transition
    funders: metadata.funders,
  };
}

/**
 * Smart migration that ensures grants structure exists
 * This is the main function to use in loaders
 *
 * @param metadata - PMC metadata from database
 * @returns Metadata with grants structure guaranteed to exist
 */
export function ensureGrantsStructure(
  metadata: PMCMetadataWithMigration | null | undefined,
): PMCMetadataWithMigration | null {
  if (!metadata) return null;

  // If already has grants, return as-is
  if (hasGrantsStructure(metadata)) {
    return metadata;
  }

  // If has legacy funders, apply migration
  if (hasLegacyFundersOnly(metadata)) {
    return applyMigration(metadata);
  }

  // Return metadata as-is (no funding information)
  return metadata;
}

// ==============================
// Validation Helpers
// ==============================

/**
 * Check if grants array has at least one HHMI grant with grant ID
 * @deprecated Use the centralized validation from '../common/validation'
 */
export function hasValidHhmiGrant(grants: GrantEntry[]): boolean {
  return hasValidHhmiGrantFromValidation(grants);
}

/**
 * Check if grants array contains HHMI funder (regardless of grant ID)
 */
export function hasHhmiFunder(grants: GrantEntry[]): boolean {
  return grants.some((grant) => grant.funderKey === 'hhmi');
}

/**
 * Get all grants for a specific funder
 */
export function getGrantsForFunder(grants: GrantEntry[], funderKey: FunderKey): GrantEntry[] {
  return grants.filter((grant) => grant.funderKey === funderKey);
}

/**
 * Check if migration would result in valid data
 * @deprecated Use the centralized validation from '../common/validation'
 */
export function validateMigrationResult(grants: GrantEntry[]): {
  isValid: boolean;
  errors: string[];
} {
  return validateMigrationResultFromValidation(grants);
}

// ==============================
// Utility Functions
// ==============================

/**
 * Get migration statistics for debugging/logging
 */
export function getMigrationStats(metadata: PMCMetadataWithMigration | null | undefined): {
  hasGrants: boolean;
  hasFunders: boolean;
  grantsCount: number;
  fundersCount: number;
  needsMigration: boolean;
} {
  if (!metadata) {
    return {
      hasGrants: false,
      hasFunders: false,
      grantsCount: 0,
      fundersCount: 0,
      needsMigration: false,
    };
  }

  return {
    hasGrants: hasGrantsStructure(metadata),
    hasFunders: !!metadata.funders && metadata.funders.length > 0,
    grantsCount: metadata.grants?.length || 0,
    fundersCount: metadata.funders?.length || 0,
    needsMigration: needsMigration(metadata),
  };
}

/**
 * Create a grant entry for HHMI with empty grant ID
 * Used as the default first entry in grant-centric UI
 */
export function createDefaultHhmiGrant(): GrantEntry {
  return {
    id: uuidv7(),
    funderKey: 'hhmi',
    grantId: '',
  };
}

/**
 * Ensure HHMI is always the first grant in the array
 * If HHMI doesn't exist, add it as the first entry
 */
export function ensureHhmiFirst(grants: GrantEntry[]): GrantEntry[] {
  const hhmiGrants = grants.filter((grant) => grant.funderKey === 'hhmi');
  const otherGrants = grants.filter((grant) => grant.funderKey !== 'hhmi');

  if (hhmiGrants.length === 0) {
    // Add default HHMI grant as first entry
    return [createDefaultHhmiGrant(), ...otherGrants];
  }

  // HHMI grants first, then others
  return [...hhmiGrants, ...otherGrants];
}
