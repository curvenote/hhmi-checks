import React, { useCallback, useState, useEffect } from 'react';
import type { NormalizedArticleRecord, NormalizedScientist } from '../backend/types.js';
import { ui } from '@curvenote/scms-core';
import { HHMIPublicationSearch, searchPublications } from './PublicationListingHelpers.js';
import { filterArticlesByDate } from '../utils/dateFiltering.js';
import type { ViewContext } from './Badges.js';

export function NonCoveredPublicationsSection({
  publications,
  emptyMessage,
  ItemComponent,
  orcid,
  scientist,
  viewContext,
}: {
  publications?: Promise<NormalizedArticleRecord[]>;
  emptyMessage?: string;
  ItemComponent: React.ComponentType<{
    item: NormalizedArticleRecord;
    orcid: string;
    viewContext: ViewContext;
  }>;
  orcid: string;
  scientist?: NormalizedScientist;
  viewContext: ViewContext;
}) {
  const [resolvedPublications, setResolvedPublications] = useState<NormalizedArticleRecord[]>([]);

  // Resolve publications promise
  useEffect(() => {
    if (publications) {
      publications.then((data) => {
        setResolvedPublications(data);
      });
    }
  }, [publications]);

  // Apply date filtering and search (no user-controlled filters)
  const applySearchAndFilters = useCallback(
    (items: NormalizedArticleRecord[], searchTerm: string) => {
      // First apply date filtering (pre-filter based on later of hire date or Jan 1, 2022)
      let filtered = filterArticlesByDate(items, scientist);

      // Then apply search
      filtered = searchPublications(filtered, searchTerm);

      return filtered;
    },
    [scientist],
  );

  const renderPublication = (
    publication: NormalizedArticleRecord,
    globalIndex: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localIndex?: number,
  ) => (
    <ItemComponent
      key={publication.id || `pub-${globalIndex}`}
      item={publication}
      orcid={orcid}
      viewContext={viewContext}
    />
  );

  const renderYearGroup = (
    year: string,
    yearPublications: NormalizedArticleRecord[],
    renderItem: (
      item: NormalizedArticleRecord,
      globalIndex: number,
      localIndex: number,
    ) => React.ReactNode,
  ) => (
    <ui.GroupedItems
      groupKey={year}
      groupItems={yearPublications}
      globalStartIndex={0} // This will be calculated properly by the parent component
      renderItem={renderItem}
      getItemKey={(publication: NormalizedArticleRecord, globalIndex: number) =>
        publication.id || `pub-${globalIndex}`
      }
      headerClassName=""
      headingTextClassName="font-extralight text-xl"
    />
  );

  return (
    <ui.ClientFilterableList
      items={publications}
      filters={[]}
      persist={true}
      searchComponent={(searchTerm, setSearchTerm) => (
        <HHMIPublicationSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      )}
      filterItems={applySearchAndFilters}
      groupBy={(publication: NormalizedArticleRecord) => publication.year || 'Unknown'}
      renderGroup={renderYearGroup}
      renderItem={renderPublication}
      getItemKey={(publication: NormalizedArticleRecord) => publication.id}
      emptyMessage={emptyMessage ?? 'No publications found using your ORCID.'}
    />
  );
}
