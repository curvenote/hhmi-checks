import { GenericNotificationEmail } from '@curvenote/scms-core';
import type { DefaultEmailProps } from '@curvenote/scms-core';
import { GeneralHelpRequestEmail } from './help-request-handlers.js';

export interface GeneralHelpRequestEmailProps {
  userName: string;
  userEmail: string;
  orcid?: string;
  sanitizedMessage?: string;
  previewText?: string;
}

export const GeneralHelpRequestEmailTemplate = ({
  asBaseUrl,
  branding,
  unsubscribeUrl,
  previewText,
  userName,
  userEmail,
  orcid,
  sanitizedMessage,
}: GeneralHelpRequestEmailProps & DefaultEmailProps) => {
  return (
    <GenericNotificationEmail
      asBaseUrl={asBaseUrl}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
      previewText={previewText || `Help request from ${userName}`}
    >
      <GeneralHelpRequestEmail
        userName={userName}
        userEmail={userEmail}
        orcid={orcid}
        sanitizedMessage={sanitizedMessage}
      />
    </GenericNotificationEmail>
  );
};
