import type { TextIntegrityDataSchema } from '../schema.js';
import { SimilarityScoresBlock } from './SimilarityScoresBlock.js';
import { TextIntegrityPdfReportStatus } from './TextIntegrityPdfReportStatus.js';
import { TopMatchesBlock } from './TopMatchesBlock.js';
import { ViewReportForm } from './ViewReportForm.js';

interface TextIntegrityResultsAreaProps {
  metadata: TextIntegrityDataSchema;
  actionPath?: string;
  workVersionId?: string;
  checkRunId?: string;
}

export function TextIntegrityResultsArea({
  metadata,
  actionPath,
  workVersionId,
  checkRunId,
}: TextIntegrityResultsAreaProps) {
  const { summaryReport, stages } = metadata;
  const reportGenStatus = stages?.reportGeneration?.status;
  const waitingForReport = reportGenStatus === 'processing' || reportGenStatus === 'pending';
  const reportGenerationComplete = reportGenStatus === 'completed';
  const reportGenerationFailed = reportGenStatus === 'error';

  if (!summaryReport) return null;

  return (
    <div className="flex flex-col gap-8">
      <SimilarityScoresBlock report={summaryReport} />
      <TopMatchesBlock report={summaryReport} />

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <ViewReportForm
          actionPath={actionPath}
          workVersionId={workVersionId}
          checkRunId={checkRunId}
          manifestLogoUrl={metadata.manifest?.logo}
          manifestTitle={metadata.manifest?.title}
        />
        <TextIntegrityPdfReportStatus
          reportGenerationComplete={reportGenerationComplete}
          reportGenerationFailed={reportGenerationFailed}
          waitingForReport={waitingForReport}
          checkRunId={checkRunId}
          workVersionId={workVersionId}
          actionPath={actionPath}
        />
      </div>
    </div>
  );
}
