import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@curvenote/scms-core';
import type { StoredSimilarityReport, StoredTopMatch } from '../schema.js';

interface TopMatchesBlockProps {
  report: StoredSimilarityReport;
}

function sourceTypeBarColor(sourceType: string): string {
  const t = sourceType.toUpperCase();
  if (t.includes('INTERNET')) return 'bg-amber-400';
  if (t.includes('PUBLICATION')) return 'bg-amber-600';
  if (t.includes('SUBMITTED')) return 'bg-emerald-500';
  return 'bg-gray-400';
}

function formatSourceType(sourceType: string): string {
  const t = sourceType.toUpperCase();
  if (t.includes('INTERNET')) return 'internet';
  if (t.includes('PUBLICATION')) return 'publications';
  if (t.includes('SUBMITTED')) return 'submitted work';
  return sourceType.toLowerCase();
}

function MatchRow({ match }: { match: StoredTopMatch }) {
  const barColor = sourceTypeBarColor(match.sourceType);
  const sourceLabel = formatSourceType(match.sourceType);
  const detail = [`${match.matchedWordCountTotal} words`, sourceLabel]
    .filter(Boolean)
    .join(', ');
  const title = match.name || 'Untitled';
  const meta = [match.submittedDate, match.institutionName].filter(Boolean).join(' by ');

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-b-0">
      <div className={cn('self-stretch w-1 rounded-full shrink-0', barColor)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex gap-2 items-baseline">
          <span className="text-lg font-semibold text-foreground">{match.percentage}%</span>
          <span className="text-sm truncate text-muted-foreground">{title}</span>
        </div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

export function TopMatchesBlock({ report }: TopMatchesBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const topMatches = report.topMatches ?? [];
  const topWordCount = report.topSourceLargestMatchedWordCount;
  const firstMatch = topMatches[0];
  const collapsedLabel = firstMatch ? firstMatch.name : 'No matching sources';
  const collapsedSubtext =
    firstMatch && topWordCount != null
      ? `${topWordCount} words from top source`
      : topMatches.length === 0
        ? 'No overlapping text found'
        : null;

  /** Yellow bar under collapsed summary, matching SimilarityScoresBlock underline styling */
  const UNDERLINE_TOP_MATCH = 'bg-amber-400';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Top Matches</h3>
      <p className="text-sm text-muted-foreground">
        These sources contained overlapping text with the manuscript you uploaded.
      </p>

      <div className="p-4 rounded-lg border shadow-sm border-border bg-card">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex gap-2 justify-between items-start w-full text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1 space-y-1">
            {firstMatch ? (
              <>
                <div className="text-2xl font-bold text-foreground">{firstMatch.percentage}%</div>
                <div className="text-sm text-muted-foreground truncate">{firstMatch.name}</div>
                {collapsedSubtext && (
                  <div className="text-xs text-muted-foreground">{collapsedSubtext}</div>
                )}
                <div className={cn('h-0.5 w-32', UNDERLINE_TOP_MATCH)} />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{collapsedLabel}</div>
            )}
          </div>
          <span className="mt-1 shrink-0 text-muted-foreground" aria-hidden>
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </span>
        </button>

        {expanded && (
          <div className="pt-4 mt-4 border-t border-border">
            {topMatches.length === 0 ? (
              <div className="py-4 text-sm text-center text-muted-foreground">
                No matching sources
              </div>
            ) : (
              <div className="space-y-0">
                {topMatches.map((match, i) => (
                  <MatchRow key={`${match.name}-${i}`} match={match} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
