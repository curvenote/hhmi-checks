import { useFetcher } from 'react-router';
import { Logos } from '../client.js';
import { SegmentedProgressBar } from './SegmentedProgressBar.js';
import type { ProofigStage } from '../schema.js';
import { ui } from '@curvenote/scms-core';

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
  if (data.status === 'failed')
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
      <StageProgressArea step={0} numSteps={4} message="Waiting to start check..." />
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
          <StageProgressArea
            step={1}
            numSteps={4}
            message="Usually takes less than 30 seconds..."
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
            message="Usually takes less than 30 seconds..."
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
            message="File received and queued for processing..."
          />
        </div>
      );
    case 'error':
    case 'failed':
      return <SimpleErrorArea step={1} numSteps={4} message="Upload failed." data={data} />;
  }
  return <DefaultArea />;
}

export function SubimageDetectionProgressArea({ data }: { data: ProofigStage }) {
  if (data.status === 'failed')
    return (
      <SimpleErrorArea step={2} numSteps={4} message="Subimage detection failed." data={data} />
    );
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Identifying sub-images...</span> Proofig is scanning your
            file to detect sub-images. When it is done, you will review the sub-images and confirm
            or correct the detection prior to integrity checking.
          </div>
        }
      />
      <StageProgressArea step={2} numSteps={4} message="Usually takes less than 30 seconds..." />
    </div>
  );
}

export function SubimageSelectionProgressArea({ data }: { data: ProofigStage }) {
  if (data.status === 'failed')
    return (
      <SimpleErrorArea step={3} numSteps={4} message="Subimage selection failed." data={data} />
    );
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="warning"
        message={
          <div>
            <span className="font-bold">Please approve sub-images.</span> Were all of your
            sub-images detected correctly? Please visit Proofig to review and confirm.
          </div>
        }
      />
      <StageProgressArea step={3} numSteps={4} message="Awaiting your review of sub-images..." />
      <div className="flex justify-end">
        <ui.Button variant="default">
          <div className="flex gap-1 items-center">
            <div>Approve sub-images at</div>
            <Logos.ProofigLogoMono className="h-7" />
          </div>
        </ui.Button>
      </div>
    </div>
  );
}

export function IntegrityDetectionProgressArea({ data }: { data: ProofigStage }) {
  if (data.status === 'failed')
    return (
      <SimpleErrorArea step={4} numSteps={4} message="Integrity detection failed." data={data} />
    );
  return (
    <div className="flex flex-col gap-6">
      <ui.SimpleAlert
        type="info"
        message={
          <div>
            <span className="font-bold">Running image integrity checks...</span> Proofig is checking
            the integrity of your sub-images. This may take some time, you can leave this page and
            come back later to see the results.
          </div>
        }
      />
      <StageProgressArea
        step={4}
        numSteps={4}
        message="This can take from a few minutes to an hour..."
      />
      <div className="flex justify-end">
        <EmailNotificationCheckbox />
      </div>
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
}: {
  step: number;
  numSteps: number;
  state?: 'default' | 'error' | 'success';
  message: string;
}) {
  return (
    <div className="space-y-1 w-full">
      <SegmentedProgressBar progress={step} numSteps={numSteps} state={state} />
      <div>
        <div className="text-xs text-left text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}

export function EmailNotificationCheckbox() {
  const fetcher = useFetcher();

  return (
    <fetcher.Form method="POST" className="flex gap-2 items-center">
      <input type="hidden" name="intent" value="email-on-detection-complete" />
      <ui.Checkbox
        name="emailOnComplete"
        value="true"
        defaultChecked={true}
        onChange={(e) => {
          // Auto-submit on change
          const formData = new FormData();
          formData.append('intent', 'email-on-detection-complete');
          // formData.append('emailOnComplete', e.target.checked ? 'true' : 'false');
          fetcher.submit(formData, { method: 'POST' });
        }}
      />
      <label htmlFor="emailOnComplete" className="text-sm cursor-pointer text-muted-foreground">
        Email me when done
      </label>
    </fetcher.Form>
  );
}
