import { ui } from '@curvenote/scms-core';
import {
  HHMIClientSearch,
  HHMIClientFilterBar,
  filterScientists,
  HHMI_FILTERS,
} from '../components/ClientListingHelpers.js';
import { ScientistListItem } from './ScientistListItem.js';
import type { NormalizedScientist } from '../backend/types.js';
import { useCallback } from 'react';

interface ScientistsListProps {
  scientists: Promise<NormalizedScientist[]>;
}

export function ScientistsList({ scientists }: ScientistsListProps) {
  // Client-side state for filtering

  const applySearchAndFilters = useCallback(
    (items: NormalizedScientist[], searchTerm: string, activeFilters: Record<string, any>) => {
      // Apply search filter
      let filtered = items;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = items.filter((scientist) => {
          return (
            scientist.fullName?.toLowerCase().includes(searchLower) ||
            scientist.firstName?.toLowerCase().includes(searchLower) ||
            scientist.lastName?.toLowerCase().includes(searchLower) ||
            scientist.email?.toLowerCase().includes(searchLower) ||
            scientist.orcid?.toLowerCase().includes(searchLower)
          );
        });
      }
      return filterScientists(filtered, activeFilters);
    },
    [],
  );

  const renderScientist = (scientist: NormalizedScientist) => {
    return <ScientistListItem scientist={scientist} baseUrl="/app/compliance/scientists" />;
  };

  return (
    <ui.ClientFilterableList
      items={scientists}
      filters={HHMI_FILTERS}
      searchComponent={(searchTerm, setSearchTerm) => (
        <HHMIClientSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      )}
      filterBar={(items, activeFilters, setActiveFilters, filterDefinitions) => (
        <HHMIClientFilterBar
          items={items}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          filterDefinitions={filterDefinitions}
        />
      )}
      filterItems={applySearchAndFilters}
      renderItem={renderScientist}
      getItemKey={(scientist: NormalizedScientist) => scientist.id}
      persist
    />
  );
}
