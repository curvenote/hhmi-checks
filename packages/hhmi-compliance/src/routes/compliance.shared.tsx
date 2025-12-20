import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { Library } from 'lucide-react';
import { PageFrame, SectionWithHeading, primitives } from '@curvenote/scms-core';
import { withAppContext } from '@curvenote/scms-server';
import { getComplianceReportsSharedWith } from '../backend/access.server.js';
import { ScientistListItem } from '../components/ScientistListItem.js';
import type { NormalizedScientist } from '../backend/types.js';
import { fetchScientistByOrcid } from '../backend/airtable.scientists.server.js';

interface LoaderData {
  scientists: NormalizedScientist[];
}

export const meta = () => {
  return [
    { title: 'Delegated Access - Compliance Dashboard' },
    { name: 'description', content: 'View compliance dashboards that I have access to' },
  ];
};

export async function loader(args: LoaderFunctionArgs): Promise<LoaderData | Response> {
  const ctx = await withAppContext(args);

  const sharedReports = await getComplianceReportsSharedWith(ctx.user.id);

  // Fetch full scientist data for each shared report that has an ORCID
  const scientists: NormalizedScientist[] = [];

  await Promise.all(
    sharedReports.map(async (report) => {
      if (report.orcid) {
        try {
          const { scientist } = await fetchScientistByOrcid(report.orcid);
          if (scientist) {
            scientists.push(scientist);
          }
        } catch (error) {
          console.error(`Failed to fetch scientist data for ORCID ${report.orcid}:`, error);
        }
      }
    }),
  );

  return {
    scientists,
  };
}

export default function SharedComplianceReportsPage({ loaderData }: { loaderData: LoaderData }) {
  const { scientists } = loaderData;

  const breadcrumbs = [
    { label: 'Compliance', href: '/app/compliance' },
    { label: 'Shared Dashboards', isCurrentPage: true },
  ];

  return (
    <PageFrame
      title="Dashboards that have been shared with you"
      subtitle="If other users have granted access to their dashboards, they will appear here."
      className="mx-auto max-w-screen-lg"
      breadcrumbs={breadcrumbs}
    >
      <SectionWithHeading heading="Shared Dashboards" icon={Library}>
        {scientists.length === 0 ? (
          <primitives.Card className="p-4 bg-white">
            <div className="flex justify-center items-center py-8 w-full">
              <div className="text-gray-500 dark:text-gray-400">
                No dashboards have been shared with you yet.
              </div>
            </div>
          </primitives.Card>
        ) : (
          <div className="space-y-3">
            {scientists.map((scientist: NormalizedScientist) => (
              <primitives.Card key={scientist.id} className="p-4 bg-white">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <ScientistListItem
                    scientist={scientist}
                    baseUrl="/app/compliance/shared/reports"
                    showShareButton={false}
                  />
                </div>
              </primitives.Card>
            ))}
          </div>
        )}
      </SectionWithHeading>
    </PageFrame>
  );
}
