import type { TextIntegrityDataSchema } from '../schema.js';
import { hasError, getErrorMessage, linearStageIsDone } from '../schema.js';
import {
  SimpleErrorArea,
  SubmittingProgressArea,
  SubmissionCompleteProgressArea,
  ProcessingProgressArea,
} from './ProgressAreas.js';

interface TextIntegrityProgressComponentProps {
  metadata: TextIntegrityDataSchema | undefined;
}

export function TextIntegrityProgressComponent({ metadata }: TextIntegrityProgressComponentProps) {
  if (!metadata?.stages) return null;

  const { submission, processing } = metadata.stages;

  if (hasError(metadata)) {
    return (
      <div>
        <SimpleErrorArea
          step={1}
          numSteps={3}
          message="Text integrity check failed."
          error={getErrorMessage(metadata)}
        />
      </div>
    );
  }
  if (processing?.status === 'processing') {
    return (
      <div>
        <ProcessingProgressArea />
      </div>
    );
  }
  if (linearStageIsDone(submission.status)) {
    return (
      <div>
        <SubmissionCompleteProgressArea />
      </div>
    );
  }

  return (
    <div>
      <SubmittingProgressArea />
    </div>
  );
}
