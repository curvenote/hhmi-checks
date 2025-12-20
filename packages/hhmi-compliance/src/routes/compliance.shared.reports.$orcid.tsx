import { fetchScientistByOrcid } from '../backend/airtable.scientists.server.js';
import { PageFrame, ui } from '@curvenote/scms-core';
import { withAppContext, getPrismaClient } from '@curvenote/scms-server';
import { ComplianceReport } from '../components/ComplianceReport.js';
import { hhmi } from '../backend/scopes.js';
import {
  fetchEverythingCoveredByPolicy,
  fetchEverythingNotCoveredByPolicy,
} from '../backend/airtable.server.js';
import type { LoaderFunctionArgs } from 'react-router';
import type { NormalizedArticleRecord, NormalizedScientist } from '../backend/types.js';
import { ComplianceInfoCards } from '../components/ComplianceInfoCards.js';

interface LoaderData {
  scientist?: NormalizedScientist;
  preprintsCovered: Promise<NormalizedArticleRecord[]>;
  preprintsNotCovered: Promise<NormalizedArticleRecord[]>;
  error?: string;
  orcid: string;
}

interface LoaderError {
  error: string;
  scientist?: null;
  publications?: never[];
  orcid?: string;
}

export const meta = ({ loaderData }: { loaderData: LoaderData }) => {
  const scientist = loaderData?.scientist;
  const title = scientist ? `${scientist.fullName} - Compliance Dashboard` : 'Compliance Dashboard';
  return [{ title }];
};

export async function loader(args: LoaderFunctionArgs): Promise<LoaderData | LoaderError> {
  const ctx = await withAppContext(args);

  const orcid = args.params.orcid;
  if (!orcid) {
    return { error: 'ORCID is required' };
  }
  const prisma = await getPrismaClient();

  // Step 1: Find the user who owns this ORCID
  const orcidOwner = await prisma.user.findFirst({
    where: {
      linkedAccounts: {
        some: {
          provider: 'orcid',
          idAtProvider: orcid,
          pending: false,
        },
      },
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      email: true,
    },
  });

  if (!orcidOwner) {
    return {
      scientist: null,
      publications: await Promise.resolve([]),
      error: 'No user found for this ORCID',
      orcid,
    };
  }

  // Step 2: Check if current user has been granted access to this user's compliance dashboard
  const accessGrant = await prisma.access.findFirst({
    where: {
      owner_id: orcidOwner.id, // ORCID owner granted the access
      receiver_id: ctx.user.id, // Current user is the receiver
      type: 'user',
      active: true,
      grants: {
        path: ['scopes'],
        array_contains: [hhmi.compliance.read],
      },
    },
  });

  if (!accessGrant) {
    return {
      scientist: null,
      publications: await Promise.resolve([]),
      error: 'Access denied: You do not have permission to view this compliance report',
      orcid,
    };
  }

  // Step 3: If authorized, fetch scientist and publications data (same as admin route)
  const preprintsCoveredPromise = fetchEverythingCoveredByPolicy(orcid);
  const preprintsNotCoveredPromise = fetchEverythingNotCoveredByPolicy(orcid);
  const { scientist, error } = await fetchScientistByOrcid(orcid);

  return {
    scientist,
    preprintsCovered: preprintsCoveredPromise,
    preprintsNotCovered: preprintsNotCoveredPromise,
    error,
    orcid,
  };
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

export default function UserComplianceReportPage({
  loaderData,
}: {
  loaderData: LoaderData | LoaderError;
}) {
  // Handle error states
  const { error } = loaderData;
  if (error) {
    return (
      <PageFrame
        title="Access Error"
        className="mx-auto max-w-screen-lg"
        breadcrumbs={[
          { label: 'My Compliance', href: '/app/compliance' },
          { label: 'Shared With Me', href: '/app/compliance/shared' },
          { label: 'Error', isCurrentPage: true },
        ]}
      >
        <div className="p-8 text-center">
          <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20">
            <div className="text-red-700 dark:text-red-400">
              <h3 className="mb-2 font-semibold">Access Error</h3>
              <p>{error}</p>
            </div>
          </div>
          <ui.Button asChild>
            <a href="/app/compliance/shared">← Back to Shared Dashboards</a>
          </ui.Button>
        </div>
      </PageFrame>
    );
  }
  const { scientist, preprintsCovered, preprintsNotCovered, orcid } = loaderData as LoaderData;

  // Determine title and breadcrumbs based on available data
  const title = scientist
    ? `Compliance Dashboard for ${scientist.fullName}`
    : `Compliance Dashboard for ${orcid}`;

  const breadcrumbs = [
    { label: 'Compliance', href: '/app/compliance' },
    { label: 'Shared Dashboards', href: '/app/compliance/shared' },
    { label: scientist?.fullName || orcid, isCurrentPage: true },
  ];

  return (
    <PageFrame
      title={title}
      className="mx-auto max-w-screen-lg"
      breadcrumbs={breadcrumbs}
      description={<ComplianceInfoCards dashboard className="mt-4" />}
    >
      <ComplianceReport
        orcid={orcid}
        scientist={scientist ?? undefined}
        articlesCovered={preprintsCovered}
        articlesNotCovered={preprintsNotCovered}
        viewContext="shared"
        emptyMessageCovered={`No articles covered by policy found. Only publications since the later of ${scientist?.fullName || orcid}'s HHMI hire date or January 1, 2022 are displayed.`}
        emptyMessageNotCovered="No articles found."
      />
    </PageFrame>
  );
}
