import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Logo, UnsubscribeButton } from '@curvenote/scms-core';
import type { DefaultEmailProps } from '@curvenote/scms-core';

export interface ComplianceReportInvitationEmailProps {
  scientistName: string;
  reportUrl: string;
  inviterName?: string;
  inviterEmail?: string;
  recipientName?: string;
  sharedByAdmin?: boolean;
}

export const ComplianceReportSharedEmail = ({
  asBaseUrl,
  branding,
  unsubscribeUrl,
  scientistName,
  reportUrl,
  inviterName,
  inviterEmail,
  recipientName,
  sharedByAdmin = false,
}: ComplianceReportInvitationEmailProps & DefaultEmailProps) => {
  const previewText = `You've been granted access to view ${scientistName}'s compliance report`;
  if (inviterEmail && !inviterName) {
    inviterName = inviterEmail;
    inviterEmail = undefined;
  }

  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Head />
        <Body className="px-2 mx-auto my-auto font-sans bg-white">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Logo asBaseUrl={asBaseUrl} branding={branding} />
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              You've been given access to {scientistName}'s compliance report
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              Hello{recipientName ? ` ${recipientName}` : ''},
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              {sharedByAdmin ? (
                <>
                  The HHMI Open Access Support Team has granted you access to view{' '}
                  <strong>{scientistName}'s compliance dashboard</strong> on behalf of the
                  scientist.
                </>
              ) : (
                <>
                  {inviterName && <strong>{inviterName}</strong>}
                  {inviterEmail && ` (${inviterEmail})`}
                  {(inviterName || inviterEmail) && ' has given you access to view '}
                  {!inviterName && !inviterEmail && 'You have been given access to view '}
                  <strong>{scientistName}'s compliance dashboard</strong>.
                </>
              )}
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              This dashboard contains information about the scientist's publications and their
              compliance with HHMI policies. Click the button below to view the dashboard:
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={reportUrl}
              >
                View Compliance Dashboard
              </Button>
            </Section>
            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
            <Text className="text-[12px] text-[#666666] leading-[24px]">
              This email was sent because you were granted access to view a compliance report. If
              you believe this was sent in error, please contact the person who granted you access.
            </Text>
            {unsubscribeUrl && (
              <UnsubscribeButton unsubscribeUrl={unsubscribeUrl} asBaseUrl={asBaseUrl} />
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
