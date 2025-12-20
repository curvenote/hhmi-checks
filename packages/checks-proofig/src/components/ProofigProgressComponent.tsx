import type { ProofigDataSchema } from '../schema.js';
import { DEFAULT_STAGES, getCurrentProofigStage } from '../schema.js';
import {
  DefaultArea,
  InitialPostProgressArea,
  SubimageDetectionProgressArea,
  SubimageSelectionProgressArea,
  IntegrityDetectionProgressArea,
} from './ProgressAreas.js';
import { ResultsReviewProgressArea } from './ResultsSummaryArea.js';
import { ResultsFinalizedArea } from './ResultsFinalizedArea.js';

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
  isSubmitting?: boolean;
}

export function ProofigProgressComponent({
  proofigData,
  isSubmitting,
}: ProofigProgressComponentProps) {
  // Defensive: provide defaults if proofigStatus or stages don't exist
  const stages = proofigData?.stages ?? DEFAULT_STAGES;

  // Calculate current progress step (1-6)
  const { currentStage, currentStageData } = getCurrentProofigStage(stages);

  let Component = <DefaultArea />;

  if (currentStage === 'initialPost') {
    Component = <InitialPostProgressArea data={currentStageData} />;
  } else if (currentStage === 'subimageDetection') {
    Component = <SubimageDetectionProgressArea data={currentStageData} />;
  } else if (currentStage === 'subimageSelection') {
    Component = <SubimageSelectionProgressArea data={currentStageData} />;
  } else if (currentStage === 'integrityDetection') {
    Component = <IntegrityDetectionProgressArea data={currentStageData} />;
  } else if (currentStage === 'resultsReview') {
    Component = <ResultsReviewProgressArea data={currentStageData} />;
  } else if (currentStage === 'finalReport') {
    Component = <ResultsFinalizedArea data={currentStageData} />;
  }
  return (
    <>
      <div>{Component}</div>
    </>
  );
}
