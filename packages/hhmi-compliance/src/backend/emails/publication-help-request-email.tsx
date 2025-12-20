import { GenericNotificationEmail } from '@curvenote/scms-core';
import type { DefaultEmailProps } from '@curvenote/scms-core';
import { HelpRequestEmail } from './help-request-email.js';
import type { NormalizedArticleRecord } from '../types.js';

export interface PublicationHelpRequestEmailProps {
  userName: string;
  userEmail: string;
  message: string;
  publication?: NormalizedArticleRecord;
  orcid: string;
  previewText?: string;
}

export const PublicationHelpRequestEmailTemplate = ({
  asBaseUrl,
  branding,
  unsubscribeUrl,
  previewText,
  userName,
  userEmail,
  message,
  publication,
  orcid,
}: PublicationHelpRequestEmailProps & DefaultEmailProps) => {
  return (
    <GenericNotificationEmail
      asBaseUrl={asBaseUrl}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
      previewText={
        previewText ||
        (publication
          ? `Help requested from ${userName} regarding publication: ${publication.title || 'Unknown'}`
          : `Help requested from ${userName} regarding compliance report`)
      }
    >
      <HelpRequestEmail
        userName={userName}
        userEmail={userEmail}
        message={message}
        publication={publication}
        orcid={orcid}
        asBaseUrl={asBaseUrl}
      />
    </GenericNotificationEmail>
  );
};
