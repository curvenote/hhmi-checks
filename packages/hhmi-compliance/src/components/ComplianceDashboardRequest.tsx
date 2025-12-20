import { useState, useEffect } from 'react';
import {
  primitives,
  ui,
  RequestHelpDialog,
  hasOrcidRequestBeenSent,
  setOrcidRequestSent,
  LoadingSpinner,
} from '@curvenote/scms-core';
import { AlertCircle } from 'lucide-react';

interface OrcidNotFoundEmptyStateProps {
  orcid: string;
}

/**
 * Empty state component shown when a user has linked their ORCID but is not found
 * in the HHMI compliance database.
 *
 * Features:
 * - Shows appropriate message based on whether a help request has been sent
 * - Allows users to request help via a dialog
 * - Stores request state in localStorage to persist across page refreshes
 * - Provides mailto link to support email as fallback
 * - Automatically clears localStorage when scientist data becomes available
 *
 */
export function ComplianceDashboardRequest({ orcid }: OrcidNotFoundEmptyStateProps) {
  const [requestSent, setRequestSent] = useState<boolean | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Check local Storage asynchronously to handle hydration properly
  useEffect(() => {
    const alreadySent = hasOrcidRequestBeenSent(orcid);
    setRequestSent(alreadySent);
  }, [orcid]);

  function handleRequestHelp() {
    setShowHelpDialog(true);
  }

  function handleRequestSuccess() {
    // Set local Storage flag
    setOrcidRequestSent(orcid);
    // Update local state to trigger re-render with success message
    setRequestSent(true);
    // Don't close the dialog here - let the user see the success message and close it themselves
  }

  return (
    <>
      <div className="flex justify-center min-h-[60vh]">
        <div>
          <primitives.Card className="w-full max-w-xl">
            <div className="p-6 space-y-6">
              {requestSent === null ? (
                // Show loading spinner as entire content until we've confirmed the state
                <div className="flex justify-center items-center min-h-[200px]">
                  <LoadingSpinner size={24} />
                </div>
              ) : (
                <>
                  {/* Info Alert Box */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">
                          {requestSent === false
                            ? 'Request your Compliance Dashboard'
                            : 'Compliance Dashboard Requested'}
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {!requestSent
                            ? 'Thank you for linking your ORCID to your HHMI Workspace account. You are now able to request a Compliance Dashboard be enabled in your account.'
                            : "Your request has been sent to the Open Science Team. We'll get back to you as soon as possible."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ORCID Link */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      ORCID:{' '}
                      <a
                        href={`https://orcid.org/${orcid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {orcid}
                      </a>
                    </p>
                  </div>

                  {/* Action Button */}
                  {!requestSent && (
                    <div>
                      <ui.StatefulButton
                        size="lg"
                        onClick={handleRequestHelp}
                        className="w-full h-12 font-semibold"
                      >
                        Request Compliance Dashboard
                      </ui.StatefulButton>
                    </div>
                  )}

                  {/* Additional Info */}
                  {!requestSent && (
                    <p className="text-sm text-center text-muted-foreground">
                      Once enabled, up to date reports on your compliance status will be available
                      on this page.
                    </p>
                  )}
                </>
              )}
            </div>
          </primitives.Card>
        </div>
      </div>

      <RequestHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        onSuccess={handleRequestSuccess}
        title="Request Compliance Dashboard"
        prompt={`Sending this request will include your name, email address and ORCID so we can respond to you.`}
        actionUrl="/app/compliance/help-request"
        intent="compliance-report-request"
        context={{ orcid }}
        messageOptional={true}
      />
    </>
  );
}
