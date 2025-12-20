import type { LoaderFunctionArgs } from 'react-router';
import { redirect, useNavigate } from 'react-router';
import { fetchScientistByOrcid } from '../backend/airtable.scientists.server.js';
import { withAppContext } from '@curvenote/scms-server';
import { PageFrame, clearOrcidRequestSent } from '@curvenote/scms-core';
import { ComplianceReport } from '../components/ComplianceReport.js';
import {
  fetchEverythingCoveredByPolicy,
  fetchEverythingNotCoveredByPolicy,
} from '../backend/airtable.server.js';
import { ComplianceDashboardRequest } from '../components/ComplianceDashboardRequest.js';
import { ComplianceInfoCards } from '../components/ComplianceInfoCards.js';
import { useEffect } from 'react';
import type { NormalizedArticleRecord, NormalizedScientist } from '../backend/types.js';

export const meta = ({ loaderData }: { loaderData: LoaderData }) => {
  const scientist = loaderData?.scientist;
  const title = scientist
    ? `${scientist.fullName} - Compliance Dashboard`
    : 'My Compliance Dashboard';
  return [{ title }];
};

export async function loader(args: LoaderFunctionArgs): Promise<LoaderData | { error: string }> {
  const ctx = await withAppContext(args);

  const orcidAccount = ctx.user.linkedAccounts.find(
    (account) => account.provider === 'orcid' && !account.pending,
  );

  const userData = (ctx.user.data as any) || {};

  // If no ORCID or pending ORCID, redirect to link page
  if (!orcidAccount) {
    throw redirect('/app/compliance/reports/me/link');
  }

  const orcid = orcidAccount.idAtProvider;
  if (!orcid) {
    return { error: 'ORCID is missing' };
  }

  const preprintsCoveredPromise = fetchEverythingCoveredByPolicy(orcid);
  const preprintsNotCoveredPromise = fetchEverythingNotCoveredByPolicy(orcid);
  const { scientist, error } = await fetchScientistByOrcid(orcid);

  // Detect if user has linked ORCID but scientist is not found in database
  const isOrcidLinkedButNotFound = !scientist && !!orcid;

  return {
    orcid,
    scientist,
    error,
    preprintsCovered: preprintsCoveredPromise,
    preprintsNotCovered: preprintsNotCoveredPromise,
    isOrcidLinkedButNotFound,
  };
}

interface LoaderData {
  orcid: string;
  scientist: NormalizedScientist | undefined;
  error?: string;
  preprintsCovered: Promise<NormalizedArticleRecord[]>;
  preprintsNotCovered: Promise<NormalizedArticleRecord[]>;
  isOrcidLinkedButNotFound: boolean;
}

export function shouldRevalidate(args?: { formAction?: string; [key: string]: any }) {
  // Prevent revalidation when help request form is submitted to avoid closing modals
  const formAction = args?.formAction;
  if (
    formAction &&
    typeof formAction === 'string' &&
    formAction.includes('/compliance/help-request')
  ) {
    return false;
  }
  return true;
}

export default function ComplianceReportPage({ loaderData }: { loaderData: LoaderData }) {
  const {
    scientist,
    preprintsCovered,
    preprintsNotCovered,
    error,
    orcid,
    isOrcidLinkedButNotFound,
  } = loaderData;
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: 'My Compliance', href: '/app/compliance' },
    { label: 'My Dashboard', isCurrentPage: true },
  ];

  // Clear localStorage flag when scientist data becomes available
  useEffect(() => {
    if (scientist && orcid) {
      clearOrcidRequestSent(orcid);
    }
  }, [scientist, orcid]);

  // Otherwise, render the normal compliance report
  return (
    <PageFrame
      enableProvider={true}
      title="Compliance Dashboard"
      className="mx-auto max-w-screen-lg"
      description={<ComplianceInfoCards className="mt-4" dashboard={!isOrcidLinkedButNotFound} />}
      breadcrumbs={breadcrumbs}
    >
      {isOrcidLinkedButNotFound ? (
        <ComplianceDashboardRequest orcid={orcid ?? 'Unknown ORCID'} />
      ) : (
        <ComplianceReport
          orcid={orcid ?? 'Unknown ORCID'}
          scientist={scientist}
          articlesCovered={preprintsCovered}
          articlesNotCovered={preprintsNotCovered}
          error={error}
          onShareClick={() => {
            navigate('/app/compliance/share');
          }}
          shareButtonText="Give Someone Access"
          viewContext="own"
          emptyMessageCovered="No articles covered by policy found. Only publications since the later of your HHMI hire date or January 1, 2022 are displayed."
          emptyMessageNotCovered="No articles found."
        />
      )}
    </PageFrame>
  );
}
