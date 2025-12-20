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

export interface WorkspaceInvitationEmailProps {
  recipientEmail: string;
  inviterName?: string;
  inviterEmail?: string;
  platformName: string;
  signupUrl: string;
  personalMessage?: string;
}

export const WorkspaceInvitationEmailTemplate = ({
  asBaseUrl,
  branding,
  unsubscribeUrl,
  recipientEmail,
  inviterName,
  inviterEmail,
  platformName,
  signupUrl,
  personalMessage,
}: WorkspaceInvitationEmailProps & DefaultEmailProps) => {
  const previewText = `You've been invited to join ${platformName}`;

  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Head />
        <Body className="px-2 mx-auto my-auto font-sans bg-white">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Logo asBaseUrl={asBaseUrl} branding={branding} />
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              You've been invited to join {platformName}
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">Hello,</Text>
            <Text className="text-[14px] text-black leading-[24px]">
              {inviterName && <strong>{inviterName}</strong>}
              {inviterEmail && ` (${inviterEmail})`}
              {(inviterName || inviterEmail) && ' has invited you to join '}
              {!inviterName && !inviterEmail && 'You have been invited to join '}
              <strong>{platformName}</strong>.
            </Text>
            {personalMessage && (
              <Section className="my-[24px] rounded border border-[#eaeaea] border-solid p-[16px] bg-[#f9f9f9]">
                <Text className="text-[14px] text-black leading-[24px] m-0">
                  <strong>Personal message:</strong>
                </Text>
                <Text className="text-[14px] text-[#333] leading-[24px] mt-[8px] mb-0 whitespace-pre-wrap">
                  {personalMessage}
                </Text>
              </Section>
            )}
            <Text className="text-[14px] text-black leading-[24px]">
              {platformName} is a platform for managing research workflows and compliance with open
              access policies. To accept this invitation and create your account, click the button
              below:
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={signupUrl}
              >
                Create Your Account
              </Button>
            </Section>
            <Text className="text-[14px] text-[#666666] leading-[24px]">
              Or copy and paste this URL into your browser:{' '}
              <a href={signupUrl} className="text-blue-600 no-underline">
                {signupUrl}
              </a>
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
            <Text className="text-[12px] text-[#666666] leading-[24px]">
              This invitation was sent to <strong>{recipientEmail}</strong>. If you believe this was
              sent in error, you can safely ignore this email.
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
