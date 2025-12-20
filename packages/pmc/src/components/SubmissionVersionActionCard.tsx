import { useFetcher } from 'react-router';
import { ui } from '@curvenote/scms-core';

interface SubmissionVersionActionCardProps {
  title: React.ReactNode;
  message: React.ReactNode;
  intent: string;
  formActionTarget?: string;
  actionButton?: React.ReactNode;
  buttonText?: React.ReactNode;
  detailedMessage?: React.ReactNode;
  submissionVersionId: string;
}

export function SubmissionVersionActionCard({
  title,
  message,
  intent,
  formActionTarget,
  detailedMessage,
  actionButton,
  buttonText,
  submissionVersionId,
}: SubmissionVersionActionCardProps) {
  const fetcher = useFetcher();

  return (
    <ui.SimpleAlert
      type="warning"
      message={
        <div className="space-y-4 text-left">
          <div className="mb-3 text-lg font-medium">{title}</div>
          <div className="mb-4">{message}</div>
          {detailedMessage && (
            <div className="italic">
              <span className="text-xl font-bold">"</span>
              {detailedMessage}
              <span className="text-xl font-bold">"</span>
            </div>
          )}
          <fetcher.Form method="post" action={formActionTarget}>
            <input type="hidden" name="intent" value={intent} />
            <input type="hidden" name="submissionVersionId" value={submissionVersionId} />
            {actionButton ? (
              actionButton
            ) : (
              <ui.StatefulButton type="submit" overlayBusy busy={fetcher.state !== 'idle'}>
                {buttonText || 'Continue'}
              </ui.StatefulButton>
            )}
          </fetcher.Form>
        </div>
      }
    />
  );
}
