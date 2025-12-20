import { Heading, Text, Section, Button } from '@react-email/components';
import React from 'react';

/**
 * Composes the email body content for a NIHMS files request notification
 */
export function composeFilesRequestEmailBody(params: {
  submitterName?: string;
  manuscriptId: string;
  message: string;
  depositUrl: string;
}): React.ReactNode {
  const { submitterName, manuscriptId, message, depositUrl } = params;

  return (
    <>
      <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
        NIHMS has requested additional files for your manuscript
      </Heading>
      <Text className="text-[14px] text-black leading-[24px]">
        Hello{submitterName ? ` ${submitterName}` : ''},
      </Text>
      <Text className="text-[14px] text-black leading-[24px]">
        NIHMS has sent a message regarding your manuscript <strong>{manuscriptId}</strong>:
      </Text>
      <Section className="my-[20px] pl-[16px] border-l-4 border-[#cccccc] bg-[#f9f9f9] py-[12px] pr-[16px]">
        <Text className="text-[14px] text-[#333333] leading-[22px] whitespace-pre-wrap my-0">
          {message}
        </Text>
      </Section>
      <Text className="text-[14px] text-black leading-[24px]">
        Please review the request and take the necessary action to update your manuscript:
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
          href={depositUrl}
        >
          Review Request
        </Button>
      </Section>
    </>
  );
}
