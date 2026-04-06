import { Logos } from '../client.js';
import { MissingReportUrlIcon } from './MissingReportUrlIcon.js';
import { ReportNoLongerAvailable } from './ReportNoLongerAvailable.js';
import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';
import { ProofigRefreshRemoteStatusButton } from './ProofigRefreshRemoteStatusButton.js';
import { ProofigSubimageApprovalReportLink } from './ProofigSubimageApprovalReportLink.js';
import { StageStartedRelative } from './StageStartedRelative.js';

export function SimpleErrorArea({
  step,
  numSteps,
  message,
  data,
}: {
  step: number;
  numSteps: number;
  message: string;
  data: ProofigStage;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="error"
        message={
          <div>
            <span className="font-bold">{message}</span> {data.error ?? 'Unknown error'}
          </div>
        }
      />
      <StageProgressArea
        step={step}
        numSteps={numSteps}
        message={data.error ?? message ?? 'Failed at this stage.'}
        state="error"
      />
    </div>
  );
}

export function PendingProgressArea({ data }: { data: ProofigStage }) {
  if (data.status === 'error')
    return <SimpleErrorArea step={0} numSteps={4} message="Failed to start check." data={data} />;

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
      <StageProgressArea step={0} numSteps={4} stageStartedAt={data.timestamp} />
    </div>
  );
}

export function InitialPostProgressArea({ data }: { data: ProofigStage }) {
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
          <StageProgressArea step={1} numSteps={4} stageStartedAt={data.timestamp} />
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
          <StageProgressArea step={1} numSteps={4} stageStartedAt={data.timestamp} />
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
          <StageProgressArea step={1} numSteps={4} stageStartedAt={data.timestamp} />
        </div>
      );
    case 'error':
      return <SimpleErrorArea step={1} numSteps={4} message="Upload failed." data={data} />;
  }
  return <DefaultArea />;
}

export function SubimageDetectionProgressArea({ data }: { data: ProofigStage }) {
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
              <span className="font-bold">Subimage detection is pending...</span> waiting for
              confirmation that processing has started.
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
            <span className="font-bold">Identifying figure panels...</span> Proofig is scanning your
            file to detect individual panels within your figures (sub-images). When it is done, you
            will review the panels and confirm or correct the detection prior to integrity checking.
          </div>
        }
      />
      <StageProgressArea step={2} numSteps={4} stageStartedAt={data.timestamp} />
    </div>
  );
}

export function SubimageApprovalProgressArea({
  data,
  reportUrl,
  deleted,
  workVersionId,
  checkRunId,
  remoteStatusActionPath,
}: {
  data: ProofigStage;
  reportUrl?: string;
  deleted?: boolean;
  workVersionId?: string;
  checkRunId?: string;
  remoteStatusActionPath?: string;
}) {
  if (data.status === 'error')
    return (
      <SimpleErrorArea step={3} numSteps={4} message="Subimage selection failed." data={data} />
    );
  if (data.status === 'notify-skipped') {
    return (
      <div className="flex flex-col gap-6">
        <ui.SimpleAlert
          type="warning"
          message={
            <div>
              <span className="font-bold">Sub-image approval (notify-skipped).</span> Our timeline
              was updated from a later Proofig state without the usual approval notification.
            </div>
          }
        />
        <StageProgressArea step={3} numSteps={4} stageStartedAt={data.timestamp} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="warning"
        message={
          <div>
            <span className="font-bold">Please approve figure panels (sub-images).</span> Were all
            of your figure panels detected correctly? Please visit Proofig to review and confirm.
          </div>
        }
      />
      <StageProgressArea step={3} numSteps={4} stageStartedAt={data.timestamp} label="Updated" />
      <div className="flex flex-wrap gap-2 items-center w-full min-w-0">
        {deleted ? (
          <ReportNoLongerAvailable />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center min-w-0">
              {!reportUrl && <MissingReportUrlIcon />}
              <ProofigSubimageApprovalReportLink
                reportUrl={reportUrl ?? ''}
                actionPath={remoteStatusActionPath}
                workVersionId={workVersionId}
                checkRunId={checkRunId}
                disabled={!reportUrl}
              >
                <div className="flex gap-1 items-center">
                  <div>Approve panels at</div>
                  <Logos.LogoMono className="h-7" />
                </div>
              </ProofigSubimageApprovalReportLink>
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
          </>
        )}
      </div>
    </div>
  );
}

export function IntegrityDetectionProgressArea({ data }: { data: ProofigStage }) {
  if (data.status === 'error')
    return (
      <SimpleErrorArea step={4} numSteps={4} message="Integrity detection failed." data={data} />
    );
  if (data.status === 'notify-skipped') {
    return (
      <div className="flex flex-col gap-6">
        <ui.SimpleAlert
          type="warning"
          message={
            <div>
              <span className="font-bold">Integrity checks (notify-skipped).</span> This step was
              marked complete from a later Proofig notify without a local “processing” phase.
            </div>
          }
        />
        <StageProgressArea step={4} numSteps={4} stageStartedAt={data.timestamp} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Running image integrity checks...</span> Proofig is checking
            the integrity of your figures. This may take several minutes, you can leave this page
            and come back later to see the results.
          </div>
        }
      />
      <StageProgressArea step={4} numSteps={4} stageStartedAt={data.timestamp} />
    </div>
  );
}

export function DefaultArea() {
  return (
    <div className="flex flex-col items-center">
      <StageProgressArea step={3} numSteps={4} state="error" message="Not yet implemented" />
    </div>
  );
}

export function StageProgressArea({
  step,
  numSteps,
  state,
  message,
  stageStartedAt,
  label,
  addSuffix,
}: {
  step: number;
  numSteps: number;
  state?: 'default' | 'error' | 'success';
  message?: string;
  /** When set, shows a live-updating “Started … ago” line instead of `message`. */
  stageStartedAt?: string;
  label?: string;
  addSuffix?: boolean;
}) {
  const subline =
    stageStartedAt != null && stageStartedAt !== '' ? (
      <StageStartedRelative isoTimestamp={stageStartedAt} label={label} addSuffix={addSuffix} />
    ) : (
      (message ?? null)
    );

  return (
    <div className="space-y-1 w-full">
      <ui.SegmentedProgressBar progress={step} numSteps={numSteps} state={state} />
      {subline != null ? (
        <div>
          <div className="text-xs text-left text-muted-foreground">{subline}</div>
        </div>
      ) : null}
    </div>
  );
}
