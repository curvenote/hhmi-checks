import type { ProofigDataSchema } from '../schema.js';
import { getProofigSummaryCounts } from '../utils/proofigSummary.js';
import { plural, ui } from '@curvenote/scms-core';
import { LogoMono } from '../icons.js';
import { ReportNoLongerAvailable } from '../components/ReportNoLongerAvailable.js';
import { ProofigRefreshRemoteStatusButton } from '../components/ProofigRefreshRemoteStatusButton.js';
import { ProofigOpenReportButton } from '../components/ProofigOpenReportButton.js';

export function SimplifiedResultsSummary({
  proofigData,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: {
  proofigData: ProofigDataSchema | undefined;
  workVersionId?: string;
  checkRunId?: string;
  remoteStatusActionPath?: string;
}) {
  const { total, matchesReview, bad } = getProofigSummaryCounts(proofigData);
  const waiting = matchesReview;
  const good = Math.max(0, total - matchesReview - bad);
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
          <div className="text-base font-bold text-[#9B1E1E]">
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
                <span className="text-[#9B1E1E]">
                  {plural('%s figure(s)', bad)} marked problematic
                </span>
                , {waiting} {good > 0 ? 'still ' : ''}waiting on review
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
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        {proofigData?.deleted ? (
          <ReportNoLongerAvailable />
        ) : (
          <div className="flex flex-wrap gap-2 items-center w-full min-w-0">
            <div className="flex flex-wrap gap-2 items-center min-w-0">
              {reportUrl ? (
                <ProofigOpenReportButton
                  reportUrl={reportUrl}
                  actionPath={remoteStatusActionPath}
                  workVersionId={workVersionId}
                  checkRunId={checkRunId}
                >
                  <span className="flex gap-2 items-center">
                    <span>Open report in</span>
                    <LogoMono className="h-7" />
                  </span>
                </ProofigOpenReportButton>
              ) : null}
            </div>
            <div className="flex-1 min-h-px min-w-4 basis-4" aria-hidden />
            <div className="flex flex-wrap gap-2 justify-end items-center">
              {remoteStatusActionPath && workVersionId ? (
                <ProofigRefreshRemoteStatusButton
                  actionPath={remoteStatusActionPath}
                  workVersionId={workVersionId}
                  checkRunId={checkRunId}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
