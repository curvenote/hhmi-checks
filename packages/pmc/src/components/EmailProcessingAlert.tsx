import type { Workflow } from '@curvenote/scms-core';
import type {
  EmailProcessingMessage,
  PMCSubmissionVersionMetadataSection,
} from '../common/metadata.schema.js';
import { formatDate } from '@curvenote/scms-core';

interface EmailProcessingAlertProps {
  metadata: PMCSubmissionVersionMetadataSection;
  workflow?: Workflow;
}

// Helper function to get user-friendly state name
const getStateLabel = (status: string, workflow: Workflow | undefined): string => {
  if (!workflow) return status;
  if (!workflow?.states) {
    return status; // Fallback to raw status if workflow is not available
  }
  const workflowState = workflow.states[status];
  return workflowState?.label || status;
};

// Helper function to filter messages by type and keep only the most recent message per toStatus
const filterAndDeduplicateMessages = (
  messages: EmailProcessingMessage[],
  type: 'error' | 'warning',
): EmailProcessingMessage[] => {
  return messages
    .filter((msg: EmailProcessingMessage) => msg.type === type)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .reduce((acc: EmailProcessingMessage[], msg) => {
      // Only keep the first occurrence of each toStatus (which is the most recent due to sorting)
      if (!acc.some((existing) => existing.toStatus === msg.toStatus)) {
        acc.push(msg);
      }
      return acc;
    }, []);
};

export function EmailProcessingAlert({ metadata, workflow }: EmailProcessingAlertProps) {
  const emailProcessing = metadata?.pmc?.emailProcessing;

  // Only show alerts for errors or warnings, not for successful processing
  if (!emailProcessing || emailProcessing.status === 'ok') {
    return null;
  }

  // Defensive programming: handle malformed objects
  if (!emailProcessing.messages || !Array.isArray(emailProcessing.messages)) {
    return null;
  }

  const messages = emailProcessing.messages;

  // Filter messages by type and keep only the most recent message per toStatus
  const errorMessages = filterAndDeduplicateMessages(messages, 'error');
  const warningMessages = filterAndDeduplicateMessages(messages, 'warning');

  // Handle errors (take precedence)
  if (errorMessages.length > 0) {
    return (
      <div className="space-y-3">
        {errorMessages.map((message: EmailProcessingMessage, index: number) => {
          const toStateLabel = workflow
            ? getStateLabel(message.toStatus, workflow)
            : message.toStatus;

          return (
            <div key={index} className="p-4 bg-red-100 border border-red-200 rounded-lg">
              <h3 className="mb-2 text-sm font-medium text-red-900">
                Processing Error - {toStateLabel}
              </h3>
              <div className="mb-2 text-sm text-red-900">{message.message}</div>
              <div className="text-xs text-red-700">
                Transitioned from {message.fromStatus} to {message.toStatus} on{' '}
                {formatDate(message.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Handle warnings (only if no errors)
  if (warningMessages.length > 0) {
    return (
      <div className="space-y-3">
        {warningMessages.map((message: EmailProcessingMessage, index: number) => {
          const toStateLabel = getStateLabel(message.toStatus, workflow);
          const fromStateLabel = getStateLabel(message.fromStatus, workflow);

          return (
            <div key={index} className="p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
              <h3 className="mb-2 text-sm font-medium text-yellow-900">
                Processing Warning - {toStateLabel}
              </h3>
              <div className="mb-2 text-sm text-yellow-900">{message.message}</div>
              <div className="text-xs text-yellow-700">
                Transitioned from {fromStateLabel} to {toStateLabel} on{' '}
                {formatDate(message.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // No errors or warnings to display
  return null;
}
