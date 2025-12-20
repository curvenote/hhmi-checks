import { ui, cn } from '@curvenote/scms-core';
import { useFetcher, useLoaderData } from 'react-router';
import type { GeneralError } from '@curvenote/scms-core';
import type { PMCWorkVersionMetadataSection } from '../common/metadata.schema.js';
import { ExternalLink } from 'lucide-react';

interface PMCReviewerInfoProps {
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  className?: string;
}

function TextFieldForm({
  intent,
  label,
  name,
  type,
  value,
  disabled,
}: {
  intent: string;
  label: string;
  name: string;
  type: string;
  value?: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher<{ success: boolean; error?: GeneralError }>();

  if (fetcher.formData?.get(name)) {
    value = fetcher.formData.get(name) as string;
  }

  return (
    <fetcher.Form method="post" className={cn('w-full', { 'opacity-50': disabled })}>
      <input type="hidden" name="intent" value={intent} />
      <ui.TextField
        disabled={disabled}
        id={name}
        name={name}
        type={type}
        label={label}
        defaultValue={value}
        error={fetcher.data?.error?.message}
        onBlur={(e) => fetcher.submit(e.target.form, { method: 'post' })}
      />
    </fetcher.Form>
  );
}

export function PMCReviewerInfo({ currentUser: currentReviewer, className }: PMCReviewerInfoProps) {
  const { metadata } = useLoaderData<{ metadata: PMCWorkVersionMetadataSection }>();
  const { pmc } = metadata;
  const fetcher = useFetcher<{ success: boolean; error?: GeneralError }>();
  const designateFetcher = useFetcher<{ success: boolean; error?: GeneralError }>();

  // Use designateReviewer from metadata or form data (for optimistic updates)
  const designateReviewer = (fetcher.formData?.get('designateReviewer') ??
    metadata?.pmc?.designateReviewer) as boolean | undefined;

  return (
    <div id="reviewer-info" className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <h2>PMC Reviewer</h2>
        <div className="max-w-full text-base prose text-stone-600 dark:text-stone-400">
          {!designateReviewer && (
            <div>
              If you are not an author or a PI for this paper,{' '}
              <designateFetcher.Form method="post" className="inline-block">
                <input type="hidden" name="intent" value="designate-reviewer" />
                <input type="hidden" name="designateReviewer" value="true" />
                <ui.Button
                  type="submit"
                  variant="link"
                  className="w-fit"
                  disabled={designateFetcher.state !== 'idle'}
                >
                  designate another reviewer
                </ui.Button>
              </designateFetcher.Form>
              .
            </div>
          )}
          <div>
            A{' '}
            <a
              href="https://www.nihms.nih.gov/help/glossary/#reviewer"
              target="_blank"
              rel="noreferrer"
              className="inline-flex gap-0.5 items-center text-inherit"
            >
              Reviewer
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            is responsible for completing the{' '}
            <a
              href="https://www.nihms.nih.gov/about/overview/#process"
              target="_blank"
              rel="noreferrer"
              className="inline-flex gap-0.5 items-center text-inherit"
            >
              initial approval
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and should be an author or a PI.{' '}
            {designateReviewer && (
              <designateFetcher.Form method="post" className="inline-block">
                <input type="hidden" name="intent" value="designate-reviewer" />
                <input type="hidden" name="designateReviewer" value="false" />
                <ui.Button
                  type="submit"
                  variant="link"
                  disabled={designateFetcher.state !== 'idle'}
                >
                  Reset reviewer
                </ui.Button>
              </designateFetcher.Form>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {!designateReviewer && (
          <div className="flex items-center gap-4 min-h-9">
            <div>
              <span className="font-bold">Reviewer: </span>
              <span className="font-normal">
                {currentReviewer.firstName} {currentReviewer.lastName} &lt;{currentReviewer.email}
                &gt;
              </span>
            </div>
            <designateFetcher.Form method="post" className="inline-block">
              <input type="hidden" name="intent" value="designate-reviewer" />
              <input type="hidden" name="designateReviewer" value="true" />
              <ui.Button
                type="submit"
                variant="link"
                className="w-fit"
                disabled={designateFetcher.state !== 'idle'}
              >
                change reviewer
              </ui.Button>
            </designateFetcher.Form>
          </div>
        )}

        {designateReviewer && (
          <>
            <div className="relative flex flex-col md:gap-4 md:flex-row">
              <div className="flex flex-col gap-4 md:flex-row grow">
                <TextFieldForm
                  intent="reviewer-first-name"
                  label="First name"
                  name="firstName"
                  type="text"
                  value={pmc?.reviewerFirstName}
                  disabled={fetcher.state !== 'idle'}
                />
                <TextFieldForm
                  intent="reviewer-last-name"
                  label="Last name"
                  name="lastName"
                  type="text"
                  value={pmc?.reviewerLastName}
                  disabled={fetcher.state !== 'idle'}
                />
                <TextFieldForm
                  intent="reviewer-email"
                  label="Email"
                  name="email"
                  type="email"
                  value={pmc?.reviewerEmail}
                  disabled={fetcher.state !== 'idle'}
                />
              </div>
            </div>
            {fetcher.data?.error && (
              <ui.SmallErrorTray error={fetcher.data.error?.message ?? 'An error occurred'} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
