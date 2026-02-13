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
  subimageDetection: 'AI detecting sub-images',
  subimageSelection: 'Ready for sub-image review',
  integrityDetection: 'Running integrity detection',
  resultsReview: 'Ready for results review',
  finalReport: 'Generating final report',
} as const;

interface ProofigProgressComponentProps {
  proofigData: ProofigDataSchema | undefined;
}

export function ProofigProgressComponent({ proofigData }: ProofigProgressComponentProps) {
  // Defensive: provide defaults if proofigStatus or stages don't exist
  const stages = { ...ALL_PENDING_STAGES, ...proofigData?.stages };

  // Calculate current progress step (1-6)
  const { currentStage } = getCurrentProofigStage(stages);

  let Component = <DefaultArea />;

  if (currentStage === 'initialPost') {
    Component = <InitialPostProgressArea data={stages.initialPost} />;
  } else if (stages.subimageDetection && currentStage === 'subimageDetection') {
    Component = <SubimageDetectionProgressArea data={stages.subimageDetection} />;
  } else if (stages.subimageSelection && currentStage === 'subimageSelection') {
    Component = (
      <SubimageApprovalProgressArea
        data={stages.subimageSelection}
        reportUrl={proofigData?.reportUrl}
      />
    );
  } else if (stages.integrityDetection && currentStage === 'integrityDetection') {
    Component = <IntegrityDetectionProgressArea data={stages.integrityDetection} />;
  } else if (stages.resultsReview && currentStage === 'resultsReview') {
    Component = <ResultsSummaryArea proofigData={proofigData} />;
  }
  return (
    <>
      <div>{Component}</div>
    </>
  );
}
