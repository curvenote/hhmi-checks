import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { User, Mail, Trash2 } from 'lucide-react';
import { primitives, ui } from '@curvenote/scms-core';
import type { GeneralError } from '@curvenote/scms-core';

interface AccessGrant {
  id: string;
  date_created: string;
  receiver?: {
    display_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
}

interface AccessGrantItemProps {
  grant: AccessGrant;
  actionUrl?: string;
  compact?: boolean;
  onRevokeSuccess?: () => void;
}

export function AccessGrantItem({
  grant,
  actionUrl,
  compact = false,
  onRevokeSuccess,
}: AccessGrantItemProps) {
  const fetcher = useFetcher<{
    success?: boolean;
    error?: GeneralError | string;
  }>();

  // Optimistic UI: keep item greyed out once submitted until reload
  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(false);
  const isSubmitting = fetcher.state === 'submitting' || hasBeenSubmitted;
  const displayName =
    grant.receiver?.display_name ||
    grant.receiver?.username ||
    grant.receiver?.email ||
    'Unknown User';

  // Handle toast notifications for revoke action
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        // Reset submission state on error so user can try again
        setHasBeenSubmitted(false);
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
      } else if (fetcher.data.success) {
        ui.toastSuccess('Access revoked successfully');
        // Trigger a reload of access grants in parent component
        // Keep hasBeenSubmitted true until reload happens
        onRevokeSuccess?.();
      }
    }
  }, [fetcher.state, fetcher.data, onRevokeSuccess]);

  return (
    <primitives.Card
      className={`${compact ? 'p-3' : 'p-4'} ${isSubmitting ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <div
        className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'} sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full dark:bg-blue-900">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <div className={`font-medium ${isSubmitting ? 'line-through' : ''}`}>{displayName}</div>
            {grant.receiver?.email && (
              <div
                className={`flex gap-1 items-center text-sm text-muted-foreground ${isSubmitting ? 'line-through' : ''}`}
              >
                <Mail className="w-3 h-3" />
                {grant.receiver.email}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`text-sm text-muted-foreground ${isSubmitting ? 'line-through' : ''}`}>
            Granted {new Date(grant.date_created).toLocaleDateString()}
          </div>
          <fetcher.Form
            method="post"
            action={actionUrl}
            onSubmit={() => {
              setHasBeenSubmitted(true);
            }}
          >
            <input type="hidden" name="intent" value="revoke" />
            <input type="hidden" name="accessId" value={grant.id} />
            <ui.StatefulButton
              type="submit"
              variant="outline"
              size="sm"
              overlayBusy
              busy={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
            >
              <div className="flex items-center">
                <Trash2 className="w-4 h-4 mr-1" />
                Revoke
              </div>
            </ui.StatefulButton>
          </fetcher.Form>
        </div>
      </div>
    </primitives.Card>
  );
}
