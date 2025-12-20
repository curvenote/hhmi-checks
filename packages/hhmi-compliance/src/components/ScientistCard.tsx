import { OrcidIcon } from '@scienceicons/react/24/solid';
import { Mail, Briefcase, CalendarCheckIcon } from 'lucide-react';
import type { NormalizedScientist } from '../backend/types.js';
import { formatDate, primitives, ui } from '@curvenote/scms-core';
import { ComplianceStatus } from './ComplianceStatus.js';

interface ScientistCardProps {
  scientist?: NormalizedScientist;
  emptyMessage?: string;
}

export function ScientistCard({ scientist, emptyMessage }: ScientistCardProps) {
  const { fullName, orcid, email, hireDate, lastReviewDate, personId, program, institution } =
    scientist || {};

  return (
    <primitives.Card className="flex flex-col gap-4 p-6 shadow-sm bg-background">
      {scientist && (
        <>
          <div className="flex flex-col w-full gap-6 md:flex-row">
            {/* Left Section - Personal and Professional Details */}
            <div className="flex-1">
              <div className="space-y-4">
                {/* Name and Title */}
                <div>
                  <h3 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {fullName}
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300">
                    {program} · {institution}
                  </div>
                </div>

                {/* Contact and ID Information */}
                <div className="grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {hireDate && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Hired: {formatDate(hireDate)}
                      </span>
                    </div>
                  )}

                  {orcid && (
                    <div className="flex items-center gap-2">
                      <OrcidIcon className="w-4 h-4 text-gray-500" />
                      <a
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                        href={`https://orcid.org/${orcid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {orcid}
                      </a>
                    </div>
                  )}

                  {email && (
                    <div className="flex items-center min-w-0 gap-2">
                      <Mail className="flex-shrink-0 w-4 h-4 text-gray-500" />
                      <a
                        className="min-w-0 text-sm text-gray-600 truncate dark:text-gray-400 hover:underline"
                        href={`mailto:${email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {email}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <CalendarCheckIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last Review:{' '}
                      <ui.SimpleTooltip
                        title={`Last Review Date: ${lastReviewDate ? formatDate(lastReviewDate) : 'none'}`}
                        asChild={false}
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {lastReviewDate ? (
                            formatDate(lastReviewDate)
                          ) : (
                            <span className="text-muted-foreground">none</span>
                          )}
                        </span>
                      </ui.SimpleTooltip>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Compliance Status */}
            <ComplianceStatus scientist={scientist} />
          </div>
        </>
      )}
      {!scientist && (
        <div className="flex items-center justify-center w-full py-8">
          <div className="text-gray-500 dark:text-gray-400">{emptyMessage ?? 'No data found'}</div>
        </div>
      )}
    </primitives.Card>
  );
}
