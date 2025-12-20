import type { NormalizedArticleRecord } from '../backend/types.js';

import { useState } from 'react';
import { PublicationModal } from './PublicationModal.js';
import { ArticleLinks } from './ArticleLinks.js';
import { ExternalLink } from 'lucide-react';
import { ui, usePingEvent, formatDate } from '@curvenote/scms-core';
import { summarizeAuthorList } from './ListingHelpers.js';
import { IssueStatusWithTooltip } from './IssueStatusWithTooltip.js';
import { HHMITrackEvent } from '../analytics/events.js';
import { formatLicenseForDisplay } from '../utils/licenseFormatting.js';
import type { ViewContext } from './Badges.js';

export function NotCoveredArticleItem({
  item,
  orcid,
  viewContext,
}: {
  item: NormalizedArticleRecord;
  orcid: string;
  viewContext: ViewContext;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pingEvent = usePingEvent();

  const handleModalOpen = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_PUBLICATION_MODAL_OPENED,
      {
        publicationId: item.id,
        publicationTitle: item.title,
      },
      { anonymous: true },
    );
    setIsModalOpen(true);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {/* Container for the table-like layout */}
      <div className="px-6 pt-4 pb-5 space-y-3">
        <div className="flex flex-col gap-1">
          {/* Row 1: Main metadata - Most recent title and top-level data */}
          <div className="grid grid-cols-12">
            {/* Column 1: Title (takes more space) */}
            <div className="col-span-12 md:col-span-12">
              <h3 className="font-normal leading-tight line-clamp-2">
                <span
                  className="text-blue-600 transition-colors cursor-pointer group hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={handleModalOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleModalOpen();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${item.title}`}
                >
                  {item.title}{' '}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModalOpen();
                    }}
                    className="text-xs transition-colors cursor-pointer text-inherit group-hover:text-blue-800 group-hover:underline dark:group-hover:text-blue-300"
                    aria-label="View publication details"
                  >
                    (view details)
                  </button>
                </span>
              </h3>
            </div>
          </div>
          <div className="text-xs">{summarizeAuthorList(item.authors)}</div>
          <div className="text-xs">{formatDate(item.date ?? '')}</div>
        </div>
        <div className="flex flex-col max-w-2xl gap-0 divide-y divide-gray-200">
          <div className="grid grid-cols-12 gap-4 p-1 text-xs font-light text-center even:bg-gray-50 odd:bg-white">
            <div className="col-span-12 md:col-span-3"></div>
            <div className="col-span-12 md:col-span-3">License</div>
            <div className="col-span-12 md:col-span-3">Issue type</div>
            <div className="col-span-12 md:col-span-3">Issue status</div>
          </div>
          {/* Row 2: Preprint data (if exists) */}
          {item.preprint?.doi && (
            <div className="grid grid-cols-12 gap-4 px-1 text-xs">
              {/* Column 1: Preprint label */}
              <div className="flex items-center col-span-12 pl-1 text-xs text-center md:col-span-3">
                <ui.Button variant="link" size="sm" asChild>
                  <a
                    href={item.preprint.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-center"
                    onClick={() =>
                      pingEvent(
                        HHMITrackEvent.HHMI_COMPLIANCE_URL_LINK_CLICKED,
                        {
                          publicationId: item.id,
                          publicationTitle: item.title,
                          urlType: 'preprint',
                          linkUrl: item.preprint?.url ?? '',
                          orcid,
                          viewContext,
                          viewLocation: 'list',
                        },
                        { anonymous: true },
                      )
                    }
                  >
                    Preprint <ExternalLink className="inline-block w-3 h-3" />
                  </a>
                </ui.Button>
              </div>

              {/* Column 2: Compliance */}
              <div className="flex items-center justify-center col-span-4 md:col-span-3">
                <div className="flex gap-[2px] items-center text-xs">
                  {formatLicenseForDisplay(item.preprint.license) ?? '—'}
                </div>
              </div>

              {/* Column 3: Compliance Issue */}
              <div className="flex items-center col-span-4 text-center md:col-span-3">
                <div className="w-full text-center text-muted-foreground">
                  {item.preprint.complianceIssueType ?? '—'}
                </div>
              </div>

              {/* Column 4: Compliance Status */}
              <div className="flex items-center col-span-4 text-center md:col-span-3">
                <IssueStatusWithTooltip
                  issueStatus={item.preprint.complianceIssueStatus}
                  issueType={item.preprint.complianceIssueType}
                />
              </div>
            </div>
          )}
          {/* Row 3: Journal article data (if exists) */}
          {item.journal?.doi && (
            <div className="grid grid-cols-12 gap-4 px-1 text-xs">
              {/* Column 1: Journal article label */}
              <div className="flex items-center col-span-12 pl-1 text-xs text-center md:col-span-3">
                <ui.Button variant="link" size="sm" asChild>
                  <a
                    href={item.journal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-center"
                    onClick={() =>
                      pingEvent(
                        HHMITrackEvent.HHMI_COMPLIANCE_URL_LINK_CLICKED,
                        {
                          publicationId: item.id,
                          publicationTitle: item.title,
                          urlType: 'journal',
                          linkUrl: item.journal?.url ?? '',
                          orcid,
                          viewContext,
                          viewLocation: 'list',
                        },
                        { anonymous: true },
                      )
                    }
                  >
                    Journal Article <ExternalLink className="inline-block w-3 h-3" />
                  </a>
                </ui.Button>
              </div>
              {/* Column 2: Compliance */}
              <div className="flex items-center justify-center col-span-4 text-center md:col-span-3">
                <div className="flex gap-[2px] items-center text-xs">
                  {formatLicenseForDisplay(item.journal.license) ?? '—'}
                </div>
              </div>

              {/* Column 3: Compliance Issue */}
              <div className="flex items-center col-span-4 text-center md:col-span-3">
                <div className="w-full text-center text-muted-foreground">
                  {item.journal.complianceIssueType ?? '—'}
                </div>
              </div>

              {/* Column 4: Compliance Status */}
              <div className="flex items-center col-span-4 text-center md:col-span-3">
                <IssueStatusWithTooltip
                  issueStatus={item.journal.complianceIssueStatus}
                  issueType={item.journal.complianceIssueType}
                />
              </div>
            </div>
          )}
          <ArticleLinks
            item={item}
            size="xs"
            className="p-1 pl-2"
            orcid={orcid}
            viewContext={viewContext}
            viewLocation="list"
          />
        </div>
      </div>
      <PublicationModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        showComplianceStatusBar={false}
        orcid={orcid}
        viewContext={viewContext}
      />
    </div>
  );
}
