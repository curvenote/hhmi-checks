import { useFetcher, useRevalidator } from 'react-router';
import type { WorkflowTransition, GeneralError } from '@curvenote/scms-core';
import { ui, usePolling } from '@curvenote/scms-core';
import { useEffect, useCallback, useState } from 'react';
import type { JobDTO } from '@curvenote/common';
import { JobStatus } from '@prisma/client';
import { zfd } from 'zod-form-data';
import { z } from 'zod';
import type { JsonValue } from '@prisma/client/runtime/library';

interface SubmissionVersionTransitionInfo {
  id: string;
  transition?: WorkflowTransition | JsonValue | null;
}

interface TransitionActionButtonProps {
  transition: WorkflowTransition;
  isPrimary: boolean;
  submissionVersion: SubmissionVersionTransitionInfo;
  onError: (error: GeneralError | string | undefined) => void;
  busy: boolean;
  disabled: boolean;
  fetcher: ReturnType<
    typeof useFetcher<{
      success: boolean;
      item?: SubmissionVersionTransitionInfo;
      error?: GeneralError | string;
    }>
  >;
  formAction?: string;
}

function TransitionActionButton({
  transition,
  isPrimary,
  submissionVersion,
  onError,
  busy,
  disabled,
  fetcher,
  formAction,
}: TransitionActionButtonProps) {
  return (
    <fetcher.Form
      method="post"
      action={formAction}
      onSubmit={() => {
        onError(undefined);
      }}
    >
      <input type="hidden" name="intent" value="transition" />
      <input type="hidden" name="submissionVersionId" value={submissionVersion.id} />
      <input type="hidden" name="transition" value={transition.name} />
      <div>
        <ui.StatefulButton
          variant={isPrimary ? 'default' : 'secondary'}
          type="submit"
          busy={busy}
          disabled={disabled}
          overlayBusy
          size="sm"
        >
          {transition.labels?.action || transition.name}
        </ui.StatefulButton>
      </div>
    </fetcher.Form>
  );
}

interface ActionsAreaProps {
  transitions: WorkflowTransition[];
  submissionVersion: SubmissionVersionTransitionInfo;
  onError: (error: GeneralError | string | undefined) => void;
  formAction?: string;
  layout?: 'vertical' | 'horizontal';
}

export const TransitionFormSchema = zfd.formData({
  intent: zfd.text(z.literal('transition')),
  submissionVersionId: zfd.text(z.uuid()),
  transition: zfd.text(z.string().min(1)),
});

export function ActionsAreaForm({
  transitions,
  submissionVersion,
  onError,
  formAction,
  layout = 'vertical',
}: ActionsAreaProps) {
  const [activeTransition, setActiveTransition] = useState<WorkflowTransition | null>(
    submissionVersion.transition as WorkflowTransition | null,
  );
  const revalidator = useRevalidator();
  const fetcher = useFetcher<{
    success: boolean;
    item?: SubmissionVersionTransitionInfo;
    error?: GeneralError | string;
  }>();

  useEffect(() => {
    if (fetcher.data?.error) {
      // Handle error with toaster
      let errorMessage: string;
      if (typeof fetcher.data.error === 'string') {
        errorMessage = fetcher.data.error;
      } else if (
        fetcher.data.error &&
        typeof fetcher.data.error === 'object' &&
        'message' in fetcher.data.error
      ) {
        errorMessage = fetcher.data.error.message;
      } else {
        errorMessage = 'An unknown error occurred';
      }
      ui.toastError(errorMessage);
    } else if (fetcher.data?.success && fetcher.data?.item) {
      // Handle success case
      const transition = fetcher.data.item.transition as WorkflowTransition;
      setActiveTransition(transition);

      // Show success toast for successful transitions (except job-based ones)
      if (!transition?.requiresJob) {
        ui.toastSuccess('Action completed successfully');
      }
    }
  }, [fetcher.data]);

  const jobId = activeTransition?.state?.jobId;
  const shouldPoll = activeTransition?.requiresJob && jobId;

  const handleJobComplete = useCallback(
    (job: JobDTO) => {
      if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
        // Job ended (success or failure), refresh submission data
        setActiveTransition(null);
        revalidator.revalidate();

        if (job.status === JobStatus.COMPLETED) {
          // Job succeeded, show success toast
          ui.toastSuccess('Action completed successfully');
        } else if (job.status === JobStatus.FAILED) {
          // Job failed, show error toast
          const errorMessage = `Job failed: ${job.messages?.join(', ') || 'Unknown error'}`;
          ui.toastError(errorMessage);
        }
      }
    },
    [revalidator],
  );

  const handleJobError = useCallback((error: Error) => {
    const errorMessage = `Job polling error: ${error.message}`;
    ui.toastError(errorMessage);
  }, []);

  const shouldStopPolling = useCallback((job: JobDTO) => {
    return job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED;
  }, []);

  usePolling<JobDTO>({
    url: `/v1/jobs/${jobId}`,
    interval: 1500,
    enabled: !!shouldPoll,
    pollImmediately: false,
    numRetries: 8,
    shouldStop: shouldStopPolling,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  if (transitions.length === 0) {
    return <span className="text-gray-400">No actions</span>;
  }

  const isHorizontal = layout === 'horizontal';

  return (
    <div
      data-name="actions-area"
      className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col'} gap-2`}
    >
      {isHorizontal && activeTransition && (
        <div className="flex items-center gap-2 animate-pulse">
          <ui.Dot />
          <div className="text-sm text-gray-400">
            {activeTransition.labels?.inProgress ?? 'in progress...'}
          </div>
        </div>
      )}
      <div className={`flex flex-wrap gap-2 ${isHorizontal ? 'justify-start' : 'justify-center'}`}>
        {transitions.map((transition: WorkflowTransition, idx: number) => (
          <TransitionActionButton
            key={transition.name}
            transition={transition}
            isPrimary={idx === 0}
            submissionVersion={submissionVersion}
            onError={onError}
            busy={fetcher.state !== 'idle' || activeTransition?.name === transition.name}
            disabled={fetcher.state !== 'idle' || !!activeTransition}
            fetcher={fetcher}
            formAction={formAction}
          />
        ))}
      </div>
      {!isHorizontal && activeTransition && (
        <>
          <div className="grow" />
          <div className="flex items-center gap-2 animate-pulse">
            <ui.Dot />
            <div className="text-gray-400 text-sm pb-[1px]">
              {activeTransition.labels?.inProgress ?? 'in progress...'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
