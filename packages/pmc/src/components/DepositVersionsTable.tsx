import { formatDate, ui, cn } from '@curvenote/scms-core';
import { Link, useSearchParams } from 'react-router';
import type { Workflow } from '@curvenote/scms-core';

export function DepositVersionsTable({
  submissionVersions,
  renderDetails,
  workflow,
  viewingSubmissionVersionId,
  basePath = '/app/sites',
}: {
  submissionVersions: any[];
  renderDetails: (row: any) => React.ReactNode;
  workflow: Workflow;
  viewingSubmissionVersionId: string;
  basePath?: string;
}) {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  return (
    <table className="w-full text-left table-fixed dark:text-white">
      <thead>
        <tr className="border-gray-400 border-b-[1px] pointer-events-none">
          <th className="w-20 px-4 py-2"></th>
          <th className="w-48 px-4 py-2">Date</th>
          <th className="w-48 px-4 py-2">Status</th>
          <th className="px-4 py-2 min-w-[250px]">Details</th>
        </tr>
      </thead>
      <tbody>
        {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
        {submissionVersions.map((row, idx) => {
          const viewing = row.id === viewingSubmissionVersionId;
          return (
            <tr key={row.id} className="border-b-[1px] border-gray-300 last:border-none">
              <td className="px-4 py-4 text-sm align-middle whitespace-nowrap">
                {row.id === viewingSubmissionVersionId && (
                  <ui.Badge variant="mono-dark">viewing</ui.Badge>
                )}
                {row.id !== viewingSubmissionVersionId && (
                  <Link
                    to={
                      basePath === '/app/sites'
                        ? `/app/sites/${row.submission.site.name}/deposits/${row.submission.id}/v/${row.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
                        : `/app/works/${row.workVersion.work_id}/site/${row.submission.site.name}/submission/${row.id}`
                    }
                  >
                    <ui.Badge
                      variant="outline"
                      className="transition-opacity cursor-pointer opacity-20 hover:opacity-100"
                    >
                      show
                    </ui.Badge>
                  </Link>
                )}
              </td>
              <td
                className={cn('px-4 py-4 text-sm align-middle whitespace-nowrap', {
                  'opacity-50': !viewing,
                  'font-medium': viewing,
                })}
              >
                <div>{formatDate(row.date_created, ' h:mm a MMM d, yyyy')}</div>
              </td>
              <td
                className={cn('px-4 py-4 text-left align-middle', {
                  'opacity-50': !viewing,
                })}
              >
                <ui.SubmissionVersionBadge
                  submissionVersion={{
                    id: row.id,
                    status: row.status,
                    submission: {
                      id: row.submission.id,
                      collection: {
                        workflow: workflow.name,
                      },
                      site: {
                        name: row.submission.site.name,
                        title: row.submission.site.title,
                        metadata: row.submission.site.metadata,
                      },
                    },
                  }}
                  workflows={{ [workflow.name]: workflow }}
                  basePath="/app/sites"
                  workVersionId={row.workVersion?.id || ''}
                  showSite={false}
                  showLink={false}
                  variant="default"
                />
              </td>
              <td
                className={cn('px-4 py-4 text-left align-top', {
                  'opacity-50': !viewing,
                  'font-medium': viewing,
                })}
              >
                {renderDetails ? renderDetails(row) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
