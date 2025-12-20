// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePMCMetadata, type PMCWorkVersionMetadata } from './validate.js';

// Mock console.log to avoid test output noise from the schema
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

beforeEach(() => {
  consoleSpy.mockClear();
});

// Helper function to create valid base metadata
function createValidMetadata(
  overrides: Partial<PMCWorkVersionMetadata> = {},
): PMCWorkVersionMetadata {
  return {
    files: {
      'file1.pdf': {
        path: 'file1.pdf',
        name: 'file1.pdf',
        type: 'application/pdf',
        size: 1024,
        md5: 'abc123def456',
        uploadDate: '2023-01-01T00:00:00.000Z',
        slot: 'pmc/manuscript',
        label: 'Manuscript',
      },
    },
    pmc: {
      certifyManuscript: true,
      title: 'Test Article Title',
      journalName: 'Test Journal',
      grants: [
        {
          id: 'grant-1',
          funderKey: 'hhmi',
          grantId: 'HHMI-12345',
          investigatorName: 'John Doe',
        },
      ],
      ownerFirstName: 'John',
      ownerLastName: 'Doe',
      ownerEmail: 'john.doe@example.com',
      issn: '1234-5678',
      issnType: 'electronic',
    },
    ...overrides,
  } as PMCWorkVersionMetadata;
}

describe('validatePMCMetadata', () => {
  describe('Success cases', () => {
    it('should return success for valid metadata', async () => {
      const metadata = createValidMetadata();
      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.validationErrors).toBeUndefined();
    });

    it('should return success with valid HHMI grant', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: 'HHMI-12345',
              investigatorName: 'Jane Smith',
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);
      expect(result.success).toBe(true);
    });

    it('should return success with multiple grants including HHMI', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: 'HHMI-12345',
            },
            {
              id: 'grant-2',
              funderKey: 'nih',
              grantId: 'NIH-67890',
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe('Files validation', () => {
    it('should fail when no files are provided', async () => {
      const metadata = createValidMetadata({ files: {} });
      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['files'],
          message: 'At least one manuscript file is required',
        }),
      );
    });

    it('should fail when no manuscript files are provided', async () => {
      const metadata = createValidMetadata({
        files: {
          'file1.pdf': {
            path: 'file1.pdf',
            name: 'file1.pdf',
            type: 'application/pdf',
            size: 1024,
            md5: 'abc123def456',
            uploadDate: '2023-01-01T00:00:00.000Z',
            slot: 'pmc/supplementary', // Not a manuscript file
            label: 'Supplementary',
          },
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['files'],
          message: 'At least one manuscript file is required',
        }),
      );
    });

    it('should filter out generic files error when manuscript-specific error exists', async () => {
      const metadata = createValidMetadata({ files: undefined as any });
      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Should have the specific manuscript error
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['files'],
          message: 'At least one manuscript file is required',
        }),
      );

      // Should NOT have generic "Required" error
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          path: ['files'],
          message: 'Required',
          code: 'invalid_type',
        }),
      );
    });
  });

  describe('PMC schema validation', () => {
    it('should fail when required fields are missing', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          title: '', // Empty title
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['title'],
          message: 'Article title is required',
        }),
      );
    });

    it('should fail when email is invalid', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          ownerEmail: 'invalid-email',
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['ownerEmail'],
          message: 'Please enter a valid email address',
        }),
      );
    });

    it('should fail when certifyManuscript is false', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          certifyManuscript: false,
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['certifyManuscript'],
          message: expect.stringContaining('You must certify'),
        }),
      );
    });
  });

  describe('Grant validation', () => {
    it('should fail when no grants are provided', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'At least one grant is required',
        }),
      );
    });

    it('should fail when no HHMI grant is present', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'nih',
              grantId: 'NIH-12345',
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
        }),
      );
    });

    it('should fail when HHMI grant has no grantId', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: '',
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Returns the custom HHMI-specific error (user-friendly)
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
        }),
      );

      // Schema-level grant ID error should be filtered out (UX improvement)
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          path: ['grants', 0, 'grantId'],
          message: 'Grant ID is required',
        }),
      );
    });

    it('should fail when HHMI grant has undefined grantId', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: undefined as any,
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Now returns the custom HHMI-specific error (independent of schema validation)
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
        }),
      );

      // Should also have the schema-level required error
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants', 0, 'grantId'],
          message: 'Invalid input: expected string, received undefined',
        }),
      );
    });

    it('should fail when individual grant has missing grantId', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: 'HHMI-12345',
            },
            {
              id: 'grant-2',
              funderKey: 'nih',
              grantId: '', // Empty grant ID
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // The error message should be improved for subsequent grants
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants', 1, 'grantId'],
          message: 'Grant 2 - NIH Grant ID is required',
        }),
      );
    });

    it('should fail with custom HHMI validation when only non-HHMI grants exist (user test case)', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'ahrq', // User's specific test case
              grantId: '123',
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Should get the custom HHMI requirement error
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
          code: 'custom',
        }),
      );
      // Should NOT have any schema-level grant errors (since AHRQ grant is valid)
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          path: ['grants', 0, 'grantId'],
        }),
      );
    });

    it('should fail when HHMI grant has whitespace-only grantId', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: '   ', // Whitespace only
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Should get the custom HHMI grant ID error (because trim() === '')
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
          code: 'custom',
        }),
      );
    });

    it('should show custom HHMI validation errors regardless of schema validation failures', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          title: '', // This will cause schema validation to fail
          grants: [
            {
              id: 'grant-1',
              funderKey: 'cdc',
              grantId: 'CDC-123', // Valid grant ID to focus on HHMI requirement
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      // Should have the custom HHMI requirement error EVEN with other validation failures
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
          code: 'custom',
        }),
      );
      // Should also have the title error
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['title'],
          message: 'Article title is required',
        }),
      );
      // Should NOT have grant ID error since CDC grant is valid
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          path: ['grants', 0, 'grantId'],
        }),
      );
    });
  });

  describe('Error filtering and transformation', () => {
    it('should show both schema and custom errors for HHMI with empty grantId', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: '', // This triggers both schema and custom validation errors
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();

      // Should show the custom HHMI-specific error (user-friendly)
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
          code: 'custom',
        }),
      );

      // Schema-level grant ID error should be filtered out for better UX
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          path: ['grants', 0, 'grantId'],
          message: 'Grant ID is required',
        }),
      );
    });

    it('should improve error messages for subsequent grants', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: 'HHMI-12345',
            },
            {
              id: 'grant-2',
              funderKey: 'nih',
              grantId: '', // Missing grant ID for second grant
            },
            {
              id: 'grant-3',
              funderKey: 'cdc',
              grantId: '', // Missing grant ID for third grant
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();

      // Should have improved error message for grant 2 (NIH)
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants', 1, 'grantId'],
          message: 'Grant 2 - NIH Grant ID is required',
        }),
      );

      // Should have improved error message for grant 3 (CDC)
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants', 2, 'grantId'],
          message: 'Grant 3 - CDC Grant ID is required',
        }),
      );
    });

    it('should show HHMI high-level error for non-HHMI first grant', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'nih', // Not HHMI, so triggers HHMI requirement error
              grantId: '', // Missing grant ID for first grant
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();

      // Should have the high-level HHMI requirement error
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants'],
          message: 'Select the HHMI Award recipient',
        }),
      );

      // Should NOT have improved message for grants.0
      expect(result.validationErrors).not.toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Grant 1 -'),
        }),
      );
    });

    it('should handle unknown funder keys gracefully in error improvement', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          grants: [
            {
              id: 'grant-1',
              funderKey: 'hhmi',
              grantId: 'HHMI-12345',
            },
            {
              id: 'grant-2',
              funderKey: 'unknown_funder' as any,
              grantId: '', // Missing grant ID
            },
          ],
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();

      // Should fallback to uppercase funder key when funder not found in map
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({
          path: ['grants', 1, 'grantId'],
          message: 'Grant 2 - UNKNOWN_FUNDER Grant ID is required',
        }),
      );
    });
  });

  describe('Complex validation scenarios', () => {
    it('should handle multiple validation errors correctly', async () => {
      const metadata = createValidMetadata({
        files: {}, // No files
        pmc: {
          ...createValidMetadata().pmc,
          title: '', // Missing title
          ownerEmail: 'invalid-email', // Invalid email
          grants: [], // No grants
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.error?.type).toBe('general');
      expect(result.error?.message).toBe('Validation failed');
      expect(result.validationErrors?.length).toBeGreaterThan(1);

      // Should include various error types
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({ message: 'At least one manuscript file is required' }),
      );
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({ message: 'Article title is required' }),
      );
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({ message: 'Please enter a valid email address' }),
      );
      expect(result.validationErrors).toContainEqual(
        expect.objectContaining({ message: 'At least one grant is required' }),
      );
    });

    it('should preserve error structure and details', async () => {
      const metadata = createValidMetadata({
        pmc: {
          ...createValidMetadata().pmc,
          title: '',
        },
      });

      const result = await validatePMCMetadata(metadata);

      expect(result.success).toBeUndefined();
      expect(result.error).toEqual({
        type: 'general',
        message: 'Validation failed',
        details: {
          issues: result.validationErrors,
          name: 'ZodError',
        },
      });
    });
  });
});
