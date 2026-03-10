import type { ProofigDataSchema } from '../schema.js';
import { ALL_PENDING_STAGES, getCurrentProofigStage } from '../schema.js';
import { SimplifiedInitialPost } from './SimplifiedInitialPost.js';
import { SimplifiedSubimageDetection } from './SimplifiedSubimageDetection.js';
import { SimplifiedSubimageApproval } from './SimplifiedSubimageApproval.js';
import { SimplifiedIntegrityDetection } from './SimplifiedIntegrityDetection.js';
import { SimplifiedResultsSummary } from './SimplifiedResultsSummary.js';
import { SimplifiedDefault } from './SimplifiedDefault.js';

interface SimplifiedProgressProps {
  proofigData: ProofigDataSchema | undefined;
}

export function SimplifiedProgress({ proofigData }: SimplifiedProgressProps) {
  const stages = { ...ALL_PENDING_STAGES, ...proofigData?.stages };
  const { currentStage } = getCurrentProofigStage(stages);

  if (currentStage === 'initialPost') {
    return <SimplifiedInitialPost data={stages.initialPost} />;
  }
  if (stages.subimageDetection && currentStage === 'subimageDetection') {
    return <SimplifiedSubimageDetection data={stages.subimageDetection} />;
  }
  if (stages.subimageSelection && currentStage === 'subimageSelection') {
    return (
      <SimplifiedSubimageApproval
        data={stages.subimageSelection}
        reportUrl={proofigData?.reportUrl}
        deleted={proofigData?.deleted}
      />
    );
  }
  if (stages.integrityDetection && currentStage === 'integrityDetection') {
    return <SimplifiedIntegrityDetection data={stages.integrityDetection} />;
  }
  if (stages.resultsReview && currentStage === 'resultsReview') {
    return <SimplifiedResultsSummary proofigData={proofigData} />;
  }
  return <SimplifiedDefault />;
}
