import { z } from 'zod';

/**
 * Zod schema for validating Crossref CSL-JSON response items
 * Based on the actual response format from doi.org/Crossref API
 */
const crossrefItemSchema = z.object({
  DOI: z.string(),
  title: z.string().min(1, 'Article title is required'),
  'container-title': z.string().min(1, 'Journal title is required'),
  'short-container-title': z.string().optional(),
  ISSN: z.array(z.string()).min(1, 'ISSN is required for PMC deposits'),
  published: z.object({
    'date-parts': z.array(z.array(z.number())).min(1, 'Publication date is required'),
  }),
  author: z
    .array(
      z.object({
        given: z.string().optional(),
        family: z.string().optional(),
      }),
    )
    .optional(),
  type: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  page: z.string().optional(),
  URL: z.string().optional(),
  source: z.string().optional(),
  publisher: z.string().optional(),
});

/**
 * Zod schema for the complete Crossref CSL-JSON response
 * The response is a single object, not wrapped in a message.items array
 */
const crossrefResponseSchema = crossrefItemSchema;

/**
 * Validation error type for Crossref responses
 */
export interface CrossrefValidationError {
  field: string;
  message: string;
}

/**
 * Validated Crossref item type
 */
export interface ValidatedCrossrefItem {
  DOI: string;
  title: string;
  'container-title': string;
  'short-container-title'?: string;
  ISSN: string[];
  published: {
    'date-parts': number[][];
  };
  author?: Array<{
    given?: string;
    family?: string;
  }>;
  type?: string;
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
  source?: string;
  publisher?: string;
}

/**
 * Validate Crossref response and return the item with proper error handling
 */
export function validateCrossrefResponse(response: any):
  | {
      success: true;
      item: ValidatedCrossrefItem;
    }
  | {
      success: false;
      error: CrossrefValidationError;
    } {
  try {
    const validatedResponse = crossrefResponseSchema.parse(response);

    return {
      success: true,
      item: validatedResponse,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Get the first validation error
      const firstError = error.issues[0];
      const field = firstError.path.join('.');
      let message = firstError.message;

      // Map field names to user-friendly error messages
      if (field === 'title') {
        message = 'DOI found but article title is missing.';
      } else if (field === 'container-title') {
        message = 'DOI found but journal title is missing. Please enter journal name manually.';
      } else if (field === 'ISSN') {
        message = 'DOI found but ISSN information is missing. ISSN is required for PMC deposits.';
      } else if (field === 'published') {
        message = 'DOI found but publication date is missing.';
      } else if (field === 'published.date-parts') {
        message = 'DOI found but publication date is missing.';
      } else if (firstError.code === 'invalid_type') {
        // fallback for missing required object fields
        if (field.endsWith('.published')) {
          message = 'DOI found but publication date is missing.';
        } else if (field === 'title') {
          message = 'DOI found but article title is missing.';
        } else if (field === 'container-title') {
          message = 'DOI found but journal title is missing. Please enter journal name manually.';
        } else if (field === 'ISSN') {
          message = 'DOI found but ISSN information is missing. ISSN is required for PMC deposits.';
        }
      }

      return {
        success: false,
        error: {
          field,
          message,
        },
      };
    }

    return {
      success: false,
      error: {
        field: 'response',
        message: 'DOI response is invalid. Please try again or enter information manually.',
      },
    };
  }
}
