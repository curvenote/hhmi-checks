import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { ZodIssue } from 'zod';
import type { GeneralError } from '@curvenote/scms-core';
import type { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

interface ValidationReportProps {
  fetcher: ReturnType<
    typeof useFetcher<{
      success?: boolean;
      error?: GeneralError;
      validationErrors?: ZodIssue[];
    }>
  >;
}

// Map Zod field paths to user-friendly section names and jump targets
const fieldSectionMap: Record<
  string,
  { section: string; target: string; label: string; order: number }
> = {
  // Publication Info (order 3-4)
  title: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'Article Title',
    order: 3,
  },
  journalInfo: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'Journal Information',
    order: 4,
  },
  issn: { section: 'Publication Info', target: 'publication-info', label: 'ISSN', order: 4 },
  issnType: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'ISSN Type',
    order: 4,
  },
  ownerFirstName: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'Owner First Name',
    order: 4,
  },
  ownerLastName: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'Owner Last Name',
    order: 4,
  },
  ownerEmail: {
    section: 'Publication Info',
    target: 'publication-info',
    label: 'Owner Email',
    order: 4,
  },

  // Files (order 5)
  files: { section: 'Files', target: 'files-section', label: 'File Uploads', order: 5 },

  // Certification (order 6)
  certifyManuscript: {
    section: 'Certification',
    target: 'certify-manuscript',
    label: 'Manuscript Certification',
    order: 6,
  },

  // Grants Info (order 7)
  grants: {
    section: 'Funding Info',
    target: 'grants-info',
    label: 'Funding Information',
    order: 7,
  },
  'grants.0': {
    section: 'Funding Info',
    target: 'grants-info',
    label: 'Funding Information',
    order: 7,
  },

  // Reviewer Info (order 8)
  reviewerFirstName: {
    section: 'Reviewer Info',
    target: 'reviewer-info',
    label: 'Reviewer First Name',
    order: 8,
  },
  reviewerLastName: {
    section: 'Reviewer Info',
    target: 'reviewer-info',
    label: 'Reviewer Last Name',
    order: 8,
  },
  reviewerEmail: {
    section: 'Reviewer Info',
    target: 'reviewer-info',
    label: 'Reviewer Email',
    order: 8,
  },
  designateReviewer: {
    section: 'Reviewer Info',
    target: 'reviewer-info',
    label: 'Designate Reviewer',
    order: 8,
  },
};

// Custom error messages for better user experience
const customErrorMessages: Record<string, string> = {
  title: 'Search with the DOI or enter manually',
  certifyManuscript: 'Please check confirmation checkbox',
  grants: 'Select the HHMI Award recipient',
  'grants.0': 'Select the HHMI Award recipient',
  reviewerFirstName: 'Reviewer first name is required when designating another reviewer',
  reviewerLastName: 'Reviewer last name is required when designating another reviewer',
  reviewerEmail: 'Reviewer email is required when designating another reviewer',
};

// Group journal-related errors into a single error
function consolidateJournalErrors(errors: ZodIssue[]): ZodIssue[] {
  const journalFields = ['journalName', 'issn', 'issnType'];
  const journalErrors = errors.filter((error) => journalFields.includes(error.path.join('.')));

  if (journalErrors.length > 0) {
    // Create a consolidated journal error
    const consolidatedJournalError: ZodIssue = {
      code: 'custom',
      message: 'Search with DOI or enter manually',
      path: ['journalInfo'],
    } as ZodIssue;

    // Remove individual journal errors and add consolidated one
    const nonJournalErrors = errors.filter(
      (error) => !journalFields.includes(error.path.join('.')),
    );
    return [consolidatedJournalError, ...nonJournalErrors];
  }

  return errors;
}

// Sort errors by the defined order
function sortErrorsByOrder(errors: ZodIssue[]): ZodIssue[] {
  return errors.sort((a, b) => {
    const pathA = a.path.join('.');
    const pathB = b.path.join('.');
    const orderA = fieldSectionMap[pathA]?.order || 999;
    const orderB = fieldSectionMap[pathB]?.order || 999;
    return orderA - orderB;
  });
}

// Scroll to form section
function scrollToSection(target: string) {
  const element = document.getElementById(target);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Add a brief highlight effect
    element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
    setTimeout(() => {
      element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
    }, 2000);
  }
}

export function ValidationReport({ fetcher }: ValidationReportProps) {
  // Check if we should show the report
  const shouldShow = fetcher.data?.success === false && fetcher.data?.error;

  if (!shouldShow) {
    return null;
  }

  const generalError = fetcher.data?.error;
  const zodErrors = (fetcher.data?.validationErrors || []) as ZodIssue[];

  // If we have Zod errors, show them as a flat list
  if (zodErrors.length > 0) {
    // Consolidate journal-related errors
    const consolidatedErrors = consolidateJournalErrors(zodErrors);
    // Sort errors by the defined order
    const sortedErrors = sortErrorsByOrder(consolidatedErrors);

    // Deduplicate errors from the grants.0.* path
    const dedupedErrors = sortedErrors.reduce((acc, error) => {
      const fieldPath = error.path.join('.');
      if (fieldPath.startsWith('grants.0')) {
        const existing = acc.find((e) => e.path.join('.') === 'grants.0');
        if (existing) {
          return acc;
        }
        acc.push({ ...error, path: ['grants', '0'] });
        return acc;
      }
      return [...acc, error];
    }, [] as ZodIssue[]);

    const errorContent = (
      <div className="space-y-2">
        <div className="mb-1 font-normal">Please fix the following issues before proceeding:</div>
        <ul className="space-y-0.5 pl-0">
          {dedupedErrors.map((error, index) => {
            const fieldPath = error.path.join('.');

            // Use custom error message if available, otherwise use the original
            const errorMessage = customErrorMessages[fieldPath] || error.message;

            // custom titles are mapped in the fieldSectionMap, otherwise use the field path
            const sectionInfo = fieldSectionMap[fieldPath] || {
              target: 'top',
              label: fieldPath,
              order: 999,
            };

            return (
              <li key={`${fieldPath}-${index}`} className="flex items-center gap-1.5 pl-0">
                <ChevronRight className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
                <button
                  onClick={() => scrollToSection(sectionInfo.target)}
                  className="flex-1 text-left text-xs hover:no-underline cursor-pointer flex items-start gap-1.5"
                >
                  <span className="underline">{sectionInfo.label}</span>
                  <span className="text-xs">- {errorMessage}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

    return <ui.SimpleAlert type="error" message={errorContent} size="compact" />;
  }

  // If we have a general error (like missing files), show it as a simple message
  if (generalError) {
    return <ui.SimpleAlert type="error" message={generalError.message} size="compact" />;
  }

  return null;
}
