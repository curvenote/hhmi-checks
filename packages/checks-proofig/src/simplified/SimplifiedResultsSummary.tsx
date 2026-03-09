import type { ProofigDataSchema } from '../schema.js';
import { getProofigSummaryCounts } from '../utils/proofigSummary.js';
import { plural, ui } from '@curvenote/scms-core';
import { ProofigLogoMono } from '../icons.js';

export function SimplifiedResultsSummary({
  proofigData,
}: {
  proofigData: ProofigDataSchema | undefined;
}) {
  const { total, waiting, bad, good } = getProofigSummaryCounts(proofigData);
  const reportUrl = proofigData?.reportUrl;

  const isAllClear = bad === 0 && waiting === 0;
  const hasOnlyConfirmedProblems = bad > 0 && waiting === 0;

  return (
    <div className="space-y-3">
      {total === 0 ? (
        <div className="space-y-1">
          <div className="text-3xl font-medium text-muted-foreground">No sub-images</div>
          <div className="text-sm text-muted-foreground">No figures were detected.</div>
        </div>
      ) : isAllClear ? (
        <div className="space-y-1">
          <div className="text-3xl font-medium text-[#1B8364]">All Clear</div>
          <div className="text-base font-bold">No issues flagged with your figures</div>
        </div>
      ) : hasOnlyConfirmedProblems ? (
        <div className="space-y-1">
          <div className="text-3xl font-medium text-[#9B1E1E]">{plural('%s Problem(s)', bad)}</div>
          <div className="text-base font-bold">
            {plural('%s figure(s)', bad)} confirmed as problematic
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-3xl font-medium text-gray-900 dark:text-gray-100">
            {bad + waiting}
            <span className="font-extralight text-gray-500">/{total}</span>
          </div>
          <div className="text-base font-bold">
            {bad > 0 && waiting > 0 && (
              <>
                {plural('%s figure(s)', bad)} marked problematic, {waiting}{' '}
                {good > 0 ? 'still ' : ''}waiting on review
              </>
            )}
            {bad === 0 && waiting > 0 && (
              <>
                {plural('%s figure(s)', waiting)} {plural('(is|are)', waiting)}{' '}
                {good > 0 ? 'still ' : ''}waiting on review
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Total: {total} · No issues: {good} · Awaiting review: {waiting} · Flagged: {bad}
      </div>
      {reportUrl && (
        <ui.Button variant="default" asChild>
          <a href={reportUrl} target="_blank" rel="noopener noreferrer">
            <span className="flex gap-2 items-center">
              <span>Open report in</span>
              <ProofigLogoMono className="h-7" />
            </span>
          </a>
        </ui.Button>
      )}
    </div>
  );
}
