import { ui } from '@curvenote/scms-core';
import type { ProofigStage } from '../../schema.js';
import { ProofigRefreshRemoteStatusButton } from '../ProofigRefreshRemoteStatusButton.js';
import { DefaultArea } from './DefaultArea.js';
import { SimpleErrorArea } from './SimpleErrorArea.js';
import { StageProgressArea } from './StageProgressArea.js';

export function InitialPostProgressArea({
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
  switch (data.status) {
    case 'pending':
      return (
        <div className="flex flex-col gap-6">
          <ui.SimpleAlert
            type="info"
            message={
              <div>
                <span className="font-bold">Connecting to service...</span> connecting to the
                service and authorizing the check.
              </div>
            }
          />
          <StageProgressArea
            step={1}
            numSteps={4}
            stageStartedAt={data.timestamp}
            trailingSlot={
              remoteStatusActionPath && workVersionId ? (
                <ProofigRefreshRemoteStatusButton
                  actionPath={remoteStatusActionPath}
                  workVersionId={workVersionId}
                  checkRunId={checkRunId}
                  buttonSize="sm"
                />
              ) : null
            }
          />
        </div>
      );
    case 'processing':
      return (
        <div className="flex flex-col gap-6">
          <ui.SimpleAlert
            type="info"
            message={
              <div>
                <span className="font-bold">Uploading to Proofig...</span> submitting your work to
                proofig for processing. Large files may take longer to submit.
              </div>
            }
          />
          <StageProgressArea
            step={1}
            numSteps={4}
            stageStartedAt={data.timestamp}
            trailingSlot={
              remoteStatusActionPath && workVersionId ? (
                <ProofigRefreshRemoteStatusButton
                  actionPath={remoteStatusActionPath}
                  workVersionId={workVersionId}
                  checkRunId={checkRunId}
                  buttonSize="sm"
                />
              ) : null
            }
          />
        </div>
      );
    case 'completed':
      return (
        <div className="flex flex-col gap-6">
          <ui.SimpleAlert
            type="info"
            message={
              <div>
                <span className="font-bold">Upload complete.</span> waiting for confirmation that
                processing has started.
              </div>
            }
          />
          <StageProgressArea
            step={1}
            numSteps={4}
            stageStartedAt={data.timestamp}
            trailingSlot={
              remoteStatusActionPath && workVersionId ? (
                <ProofigRefreshRemoteStatusButton
                  actionPath={remoteStatusActionPath}
                  workVersionId={workVersionId}
                  checkRunId={checkRunId}
                  buttonSize="sm"
                />
              ) : null
            }
          />
        </div>
      );
    case 'error':
      return <SimpleErrorArea step={1} numSteps={4} message="Upload failed." data={data} />;
  }
  return <DefaultArea />;
}
