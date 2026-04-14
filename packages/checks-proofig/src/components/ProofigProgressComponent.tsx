import type { ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import {
  DefaultArea,
  InitialPostProgressArea,
  SubimageDetectionProgressArea,
  SubimageApprovalProgressArea,
  IntegrityDetectionProgressArea,
} from './ProgressAreas.js';
import { ResultsSummaryArea } from './ResultsSummaryArea.js';

export const STAGE_LABELS = {
  initialPost: 'Uploading to Proofig',
  subimageDetection: 'Sub-image detection',
  subimageSelection: 'Ready for sub-image review',
  integrityDetection: 'Running integrity detection',
  resultsReview: 'Ready for results review',
  finalReport: 'Generating final report',
} as const;

interface ProofigProgressComponentProps {
  proofigData: ProofigDataSchema | undefined;
  workVersionId?: string;
  checkRunId?: string;
  remoteStatusActionPath?: string;
}

export function ProofigProgressComponent({
  proofigData,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: ProofigProgressComponentProps) {
  // Defensive: provide defaults if proofigStatus or stages don't exist
  const stages = { ...ALL_PENDING_STAGES, ...proofigData?.stages };

  // Calculate current progress step (1-6)
  const { currentStage } = getCurrentProofigStage(stages);

  let Component = <DefaultArea />;

  if (currentStage === 'initialPost') {
    Component = (
      <InitialPostProgressArea
        data={stages.initialPost}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        remoteStatusActionPath={remoteStatusActionPath}
      />
    );
  } else if (stages.subimageDetection && currentStage === 'subimageDetection') {
    Component = (
      <SubimageDetectionProgressArea
        data={stages.subimageDetection}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        remoteStatusActionPath={remoteStatusActionPath}
      />
    );
  } else if (stages.subimageSelection && currentStage === 'subimageSelection') {
    Component = (
      <SubimageApprovalProgressArea
        data={stages.subimageSelection}
        reportUrl={proofigData?.reportUrl}
        deleted={proofigData?.deleted}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        remoteStatusActionPath={remoteStatusActionPath}
      />
    );
  } else if (stages.integrityDetection && currentStage === 'integrityDetection') {
    Component = (
      <IntegrityDetectionProgressArea
        data={stages.integrityDetection}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        remoteStatusActionPath={remoteStatusActionPath}
      />
    );
  } else if (stages.resultsReview && currentStage === 'resultsReview') {
    Component = (
      <ResultsSummaryArea
        proofigData={proofigData}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        remoteStatusActionPath={remoteStatusActionPath}
      />
    );
  }
  return (
    <>
      <div>{Component}</div>
    </>
  );
}
