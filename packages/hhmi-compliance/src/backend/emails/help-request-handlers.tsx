import { Heading, Text, Section } from '@react-email/components';
import React from 'react';

/**
 * Composes the email body for a compliance report request
 */
export function ComplianceReportRequestEmail(params: {
  userName: string;
  userEmail: string;
  orcid: string;
  sanitizedMessage?: string;
}): React.ReactNode {
  const { userName, userEmail, orcid, sanitizedMessage } = params;

  return (
    <>
      <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-black">
        Compliance Dashboard Request
      </Heading>
      <Section className="my-[16px] p-[16px] bg-[#f4f4f4] rounded">
        <Text className="text-[14px] text-black leading-[24px] my-0">
          <strong>From:</strong> {userName} ({userEmail})
        </Text>
        <Text className="text-[14px] text-black leading-[24px] my-0">
          <strong>ORCID:</strong> {orcid}
        </Text>
      </Section>
      <Text className="text-[14px] text-black leading-[24px]">
        <strong>Issue:</strong> User has linked their ORCID on the HHMI Workspace but is not yet
        included in the HHMI compliance database.
      </Text>
      {sanitizedMessage && (
        <>
          <Text className="text-[14px] text-black leading-[24px] mt-[16px]">
            <strong>Additional Information:</strong>
          </Text>
          <Section className="my-[16px] p-[16px] bg-[#f4f4f4] rounded">
            <Text className="text-[14px] text-black leading-[24px] whitespace-pre-wrap my-0">
              {sanitizedMessage}
            </Text>
          </Section>
        </>
      )}
    </>
  );
}

/**
 * Composes the email body for a general help request
 */
export function GeneralHelpRequestEmail(params: {
  userName: string;
  userEmail: string;
  orcid?: string;
  sanitizedMessage?: string;
}): React.ReactNode {
  const { userName, userEmail, orcid, sanitizedMessage } = params;

  return (
    <>
      <Heading className="mx-0 my-[30px] p-0 text-[24px] font-normal text-black">
        Compliance Help Request
      </Heading>
      <Section className="my-[16px] p-[16px] bg-[#f4f4f4] rounded">
        <Text className="text-[14px] text-black leading-[24px] my-0">
          <strong>From:</strong> {userName} ({userEmail})
        </Text>
        {orcid && (
          <Text className="text-[14px] text-black leading-[24px] my-0">
            <strong>ORCID:</strong> {orcid}
          </Text>
        )}
      </Section>
      {sanitizedMessage && (
        <>
          <Text className="text-[14px] text-black leading-[24px]">
            <strong>Additional Information:</strong>
          </Text>
          <Section className="my-[16px] p-[16px] bg-[#f4f4f4] rounded">
            <Text className="text-[14px] text-black leading-[24px] whitespace-pre-wrap my-0">
              {sanitizedMessage}
            </Text>
          </Section>
        </>
      )}
    </>
  );
}
