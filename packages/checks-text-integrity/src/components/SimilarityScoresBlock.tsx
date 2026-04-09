import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@curvenote/scms-core';
import type { StoredSimilarityReport } from '../schema.js';

interface SimilarityScoresBlockProps {
  report: StoredSimilarityReport;
}

const UNDERLINE_COLOR_OVERALL = 'bg-red-500';
const UNDERLINE_COLOR_INTERNET_PUB = 'bg-amber-400';
const UNDERLINE_COLOR_SUBMITTED = 'bg-emerald-500';

export function SimilarityScoresBlock({ report }: SimilarityScoresBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const overall = report.overallMatchPercentage ?? 0;
  const internet = report.internetMatchPercentage;
  const publication = report.publicationMatchPercentage;
  const submitted = report.submittedWorksMatchPercentage;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Similarity scores</h3>
      <p className="text-sm text-muted-foreground">
        This is the amount of text matching other sources. Generally, you should worry more when
        this number is <strong>above 20%</strong>. But a low score can still contain plagiarism, and
        a high score can still be explainable.
      </p>

      <div className="p-4 rounded-lg border shadow-sm border-border bg-card">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex gap-2 justify-between items-start w-full text-left"
          aria-expanded={expanded}
        >
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{overall}%</div>
            <div className="text-sm text-muted-foreground">Text similar to other sources</div>
            <div className={cn('h-0.5 w-32', UNDERLINE_COLOR_OVERALL)} />
          </div>
          <span className="mt-1 shrink-0 text-muted-foreground" aria-hidden>
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </span>
        </button>

        {expanded && (
          <div className="pt-4 mt-4 space-y-3 border-t border-border">
            {internet != null && (
              <div className="space-y-0.5">
                <div className="text-lg font-medium text-foreground">{internet}%</div>
                <div className="text-sm text-muted-foreground">Internet sources</div>
                <div className={cn('h-0.5 w-24', UNDERLINE_COLOR_INTERNET_PUB)} />
              </div>
            )}
            {publication != null && (
              <div className="space-y-0.5">
                <div className="text-lg font-medium text-foreground">{publication}%</div>
                <div className="text-sm text-muted-foreground">Publications</div>
                <div className={cn('h-0.5 w-24', UNDERLINE_COLOR_INTERNET_PUB)} />
              </div>
            )}
            {submitted != null && (
              <div className="space-y-0.5">
                <div className="text-lg font-medium text-foreground">{submitted}%</div>
                <div className="text-sm text-muted-foreground">Submitted works</div>
                <div className={cn('h-0.5 w-24', UNDERLINE_COLOR_SUBMITTED)} />
              </div>
            )}
            {internet == null && publication == null && submitted == null && (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
