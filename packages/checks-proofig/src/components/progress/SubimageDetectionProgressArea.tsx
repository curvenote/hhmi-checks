import { useEffect, useState } from 'react';
import { cn, ui } from '@curvenote/scms-core';
import type { ProofigStage } from '../../schema.js';
import { ProofigProgressRefreshRow } from '../ProofigProgressRefreshRow.js';
import { SimpleErrorArea } from './SimpleErrorArea.js';
import { StageProgressArea } from './StageProgressArea.js';

const FOLLOW_UP_DELAY_MS = 5000;

export function SubimageDetectionProgressArea({
  data,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: {
  data: ProofigStage;
  workVersionId?: string;
  checkRunId?: string;
  remoteStatusActionPath?: string;
}) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  useEffect(() => {
    setShowFollowUp(false);
    const handle = setTimeout(() => setShowFollowUp(true), FOLLOW_UP_DELAY_MS);
    return () => clearTimeout(handle);
  }, [data.status]);

  if (data.status === 'error')
    return (
      <SimpleErrorArea step={2} numSteps={4} message="Subimage detection failed." data={data} />
    );
  if (data.status === 'pending') {
    return (
      <div className="flex flex-col gap-6">
        <ui.SimpleAlert
          type="info"
          message={
            <div>
              <span className="font-bold">Sub-image detection is pending...</span> waiting for
              confirmation that processing has begun.
            </div>
          }
        />
        <StageProgressArea
          step={1}
          numSteps={4}
          stageStartedAt={data.timestamp}
          label="Waiting for"
          addSuffix={false}
        />
        <ProofigProgressRefreshRow
          remoteStatusActionPath={remoteStatusActionPath}
          workVersionId={workVersionId}
          checkRunId={checkRunId}
          buttonSize="sm"
        />
      </div>
    );
  }
  if (data.status === 'notify-skipped') {
    return (
      <div className="flex flex-col gap-6">
        <ui.SimpleAlert
          type="warning"
          message={
            <div>
              <span className="font-bold">Sub-image detection (notify-skipped).</span> This step was
              marked complete when a later Proofig notify arrived without the usual progression.
            </div>
          }
        />
        <StageProgressArea
          step={2}
          numSteps={4}
          stageStartedAt={data.timestamp}
          label="Completed"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <p className={cn('mt-0', { 'mb-0': !showFollowUp })}>
              <span className="font-bold">Proofig is identifying sub-images...</span> your file is
              being scanned to detect individual sub-images within your figures.
            </p>
            {showFollowUp ? (
              <p className="mb-0">
                Once completed, you must review the sub-images and confirm or correct them before
                integrity checking can proceed.
              </p>
            ) : null}
          </div>
        }
      />
      <StageProgressArea step={2} numSteps={4} stageStartedAt={data.timestamp} />
      <ProofigProgressRefreshRow
        remoteStatusActionPath={remoteStatusActionPath}
        workVersionId={workVersionId}
        checkRunId={checkRunId}
        buttonSize="sm"
      />
    </div>
  );
}
