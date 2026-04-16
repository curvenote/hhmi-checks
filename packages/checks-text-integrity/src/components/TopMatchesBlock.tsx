import type { StoredSimilarityReport, StoredTopMatch } from '../schema.js';
import { SimilarityPercentageBar } from './SimilarityPercentageBar.js';

interface TopMatchesBlockProps {
  report: StoredSimilarityReport;
}

function formatSourceType(sourceType: string): string {
  const t = sourceType.toUpperCase();
  if (t.includes('INTERNET')) return 'internet';
  if (t.includes('PUBLICATION')) return 'publications';
  if (t.includes('SUBMITTED')) return 'submitted work';
  return sourceType.toLowerCase();
}

function MatchRow({ match }: { match: StoredTopMatch }) {
  const sourceLabel = formatSourceType(match.sourceType);
  const detail = [`${match.matchedWordCountTotal} words`, sourceLabel].filter(Boolean).join(', ');
  const title = match.name || 'Untitled';
  const meta = [match.submittedDate, match.institutionName].filter(Boolean).join(' by ');
  const pct = match.percentage ?? 0;

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="min-w-0 space-y-1.5">
        <div className="flex gap-2 items-baseline">
          <span className="text-lg font-semibold text-foreground">{match.percentage}%</span>
          <span className="text-sm truncate text-muted-foreground">{title}</span>
        </div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        <div className="text-xs text-muted-foreground">{detail}</div>
        <SimilarityPercentageBar percentage={pct} />
      </div>
    </div>
  );
}

export function TopMatchesBlock({ report }: TopMatchesBlockProps) {
  const topMatches = report.topMatches ?? [];

  return (
    <div className="px-4 py-2 rounded-lg border shadow-sm border-border bg-card">
      {topMatches.length === 0 ? (
        <div className="py-4 text-sm text-center text-muted-foreground">No matching sources</div>
      ) : (
        <div className="space-y-0">
          {topMatches.map((match, i) => (
            <MatchRow key={`${match.name}-${i}`} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
