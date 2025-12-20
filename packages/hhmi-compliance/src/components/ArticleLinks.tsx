import React from 'react';
import { cn } from '@curvenote/scms-core';
import type { NormalizedArticleRecord } from '../backend/types.js';
import { PMCLink, CurvenotePMCLink, CurvenotePreprintLink, PubMedLink } from './Badges.js';
import type { ViewContext, ViewLocation } from './Badges.js';
import { isCCBY } from '../utils/licenseFormatting.js';

export function ArticleLinks({
  item,
  size = 'xs',
  className,
  orcid,
  viewContext,
  viewLocation,
}: {
  item: NormalizedArticleRecord;
  size?:
    | 'tiny'
    | 'xs'
    | 'sm'
    | 'default'
    | 'lg'
    | 'icon'
    | 'icon-sm'
    | 'icon-xs'
    | null
    | undefined;
  className?: string;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  // Build array of link elements
  const linkElements: React.ReactNode[] = [];

  if (item.pmid) {
    linkElements.push(
      <PubMedLink
        key="pubmed-link"
        pmid={item.pmid}
        publicationId={item.id}
        publicationTitle={item.journal?.title ?? item.title ?? ''}
        size={size}
        orcid={orcid}
        viewContext={viewContext}
        viewLocation={viewLocation}
      />,
    );
  }

  if (item.pmcid) {
    linkElements.push(
      <PMCLink
        key="pmc-link"
        pmcid={item.pmcid}
        publicationId={item.id}
        publicationTitle={item.journal?.title ?? item.title ?? ''}
        size={size}
        orcid={orcid}
        viewContext={viewContext}
        viewLocation={viewLocation}
      />,
    );
  }

  if (item.pmcid && isCCBY(item.journal?.license)) {
    linkElements.push(
      <CurvenotePMCLink
        key="curvenote-pmc-link"
        pmcid={item.pmcid}
        publicationId={item.id}
        publicationTitle={item.journal?.title ?? item.title ?? ''}
        size={size}
        orcid={orcid}
        viewContext={viewContext}
        viewLocation={viewLocation}
      />,
    );
  }

  if (item.preprint?.doi && item.preprint?.doi.includes('10.1101/')) {
    linkElements.push(
      <CurvenotePreprintLink
        key="curvenote-preprint-link"
        preprintDoi={item.preprint.doi}
        publicationId={item.id}
        publicationTitle={item.title ?? ''}
        size={size}
        orcid={orcid}
        viewContext={viewContext}
        viewLocation={viewLocation}
      />,
    );
  }

  if (linkElements.length === 0) return null;

  return (
    <div className={cn('grid grid-cols-12 gap-4 dark:border-gray-800', className)}>
      <div className="flex flex-wrap items-center col-span-12 gap-2">
        {linkElements.map((element, index) => (
          <React.Fragment key={index}>
            {element}
            {index < linkElements.length - 1 && (
              <span className="select-none text-muted-foreground">·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
