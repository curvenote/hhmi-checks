import { GenericNotificationEmail } from '@curvenote/scms-core';
import type { DefaultEmailProps } from '@curvenote/scms-core';
import { ComplianceReportRequestEmail } from './help-request-handlers.js';

export interface ComplianceReportRequestEmailProps {
  userName: string;
  userEmail: string;
  orcid: string;
  sanitizedMessage?: string;
  previewText?: string;
}

export const ComplianceReportRequestEmailTemplate = ({
  asBaseUrl,
  branding,
  unsubscribeUrl,
  previewText,
  userName,
  userEmail,
  orcid,
  sanitizedMessage,
}: ComplianceReportRequestEmailProps & DefaultEmailProps) => {
  return (
    <GenericNotificationEmail
      asBaseUrl={asBaseUrl}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
      previewText={previewText || `Compliance report request from ${userName}`}
    >
      <ComplianceReportRequestEmail
        userName={userName}
        userEmail={userEmail}
        orcid={orcid}
        sanitizedMessage={sanitizedMessage}
      />
    </GenericNotificationEmail>
  );
};
