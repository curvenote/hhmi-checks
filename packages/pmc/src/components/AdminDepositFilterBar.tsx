import { Search } from 'lucide-react';
import { ui } from '@curvenote/scms-core';

interface AdminDepositFilterBarProps {
  notSubmittedCount: number;
  needsAttentionCount: number;
  notSubmitted: boolean;
  needsAttention: boolean;
  onNotSubmittedChange: (value: boolean) => void;
  onNeedsAttentionChange: (value: boolean) => void;
  onClearAll: () => void;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AdminDepositFilterBar({
  notSubmittedCount,
  needsAttentionCount,
  notSubmitted,
  needsAttention,
  onNotSubmittedChange,
  onNeedsAttentionChange,
  onClearAll,
  searchValue = '',
  onSearchChange,
}: AdminDepositFilterBarProps) {
  return (
    <div className="flex items-center w-full gap-6 px-1 py-2">
      {/* Search input */}
      <div className="relative w-72">
        <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
          <Search className="w-4 h-4" aria-hidden="true" />
        </span>
        <input
          type="text"
          className="w-full py-2 pr-3 text-sm placeholder-gray-400 bg-white border border-gray-200 rounded outline-none pl-9 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          placeholder="Filter by title, journal, identifier"
          value={searchValue}
          onChange={onSearchChange}
          aria-label="Filter by title, journal, identifier"
        />
      </div>
      {/* Filter toggles */}
      <div className="flex items-center gap-4">
        <ui.Button
          type="button"
          variant={'ghost'}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 ${
            notSubmitted ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-pressed={notSubmitted}
          onClick={() => onNotSubmittedChange(!notSubmitted)}
        >
          Not submitted yet
          <span
            className={`inline-flex items-center justify-center rounded bg-blue-500 text-white text-xs font-bold w-6 h-6 transition-colors ml-1 ${
              notSubmitted ? '' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {notSubmittedCount}
          </span>
        </ui.Button>
        <ui.Button
          type="button"
          variant={'ghost'}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 ${
            needsAttention ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-pressed={needsAttention}
          onClick={() => onNeedsAttentionChange(!needsAttention)}
        >
          Needs your attention
          <span
            className={`inline-flex items-center justify-center rounded bg-blue-500 text-white text-xs font-bold w-6 h-6 transition-colors ml-1 ${
              needsAttention ? '' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {needsAttentionCount}
          </span>
        </ui.Button>
      </div>
      {/* Spacer */}
      <div className="flex-1" />
      {/* Clear all filters */}
      <ui.Button
        type="button"
        variant="ghost"
        className="px-2 py-1 text-sm font-normal text-gray-400 hover:text-blue-500"
        onClick={onClearAll}
        aria-label="Clear all filters"
      >
        Clear all filters
      </ui.Button>
    </div>
  );
}
