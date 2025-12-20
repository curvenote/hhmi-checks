import { Check } from 'lucide-react';
import type { NormalizedScientist } from '../backend/types.js';
import { cn, plural } from '@curvenote/scms-core';

export function ComplianceStatusBadge({
  scientist,
  align = 'left',
}: {
  scientist: NormalizedScientist;
  align?: 'left' | 'right';
}) {
  const { preprints, publications } = scientist;

  const totalPublications = (preprints?.total ?? 0) + (publications?.total ?? 0);
  const allCompliant = preprints?.nonCompliant === 0 && publications?.nonCompliant === 0;

  // Check if there are no publications at all
  if (totalPublications === 0) {
    return (
      <div
        className={cn('flex gap-1 justify-start items-center text-md', {
          'md:justify-end': align === 'right',
        })}
      >
        <span className="text-muted-foreground">No Published Work</span>
      </div>
    );
  }

  if (allCompliant) {
    return (
      <div
        className={cn('flex gap-1 justify-start items-center text-md', {
          'md:justify-end': align === 'right',
        })}
      >
        <Check className="w-3 h-3 text-success" />
        <span className="font-medium text-success">Compliant</span>
      </div>
    );
  }

  const totalIssues = (preprints?.nonCompliant ?? 0) + (publications?.nonCompliant ?? 0);

  return (
    <div className="flex flex-col justify-start">
      <div
        className={cn('flex gap-1 justify-start items-center font-medium text-md', {
          'md:justify-end': align === 'right',
        })}
      >
        <span className="font-semibold text-red-700">{totalIssues}</span>
        <span className="text-red-800">{plural('Compliance issue(s)', totalIssues)}</span>
      </div>
    </div>
  );
}
