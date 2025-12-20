import type { PMCWorkVersionMetadataSection } from '../common/metadata.schema.js';
import { PMC_FUNDERS_MAP } from './funders.js';
import { ui } from '@curvenote/scms-core';

export function PreviewMetadataSection({
  pmc,
  showContactLinks = false,
}: {
  pmc: PMCWorkVersionMetadataSection['pmc'];
  showContactLinks?: boolean;
}) {
  // Use grants if available, otherwise fall back to funders for backward compatibility
  const grants = pmc?.grants || [];
  const funders = pmc?.funders || [];
  const hasGrants = grants.length > 0;
  const hasFunders = funders.length > 0;

  // Determine which data to display
  const displayGrants = hasGrants ? grants : [];
  const displayFunders = !hasGrants && hasFunders ? funders : [];

  return (
    <div className="mt-6">
      <dl className="space-y-2">
        <div className="flex items-center">
          <dt className="w-42 shrink-0">Submitter:</dt>
          <dd className="font-light">
            {`${pmc?.ownerFirstName} ${pmc?.ownerLastName} <${pmc?.ownerEmail}>`}{' '}
            {showContactLinks && (
              <ui.Button variant="link" className="p-0 ml-1" asChild>
                <a href={`mailto:${pmc?.ownerEmail}`}>contact</a>
              </ui.Button>
            )}
          </dd>
        </div>
        <div className="flex items-center">
          <dt className="w-42 shrink-0">Reviewer:</dt>
          <dd className="font-light">
            {pmc?.designateReviewer ? (
              <>
                <span>{`${pmc.reviewerFirstName} ${pmc.reviewerLastName} <${pmc.reviewerEmail}>`}</span>
                {showContactLinks && (
                  <ui.Button variant="link" className="p-0 ml-1" asChild>
                    <a href={`mailto:${pmc.reviewerEmail}`}>contact</a>
                  </ui.Button>
                )}
              </>
            ) : (
              <>
                <span>{`${pmc?.ownerFirstName} ${pmc?.ownerLastName} <${pmc?.ownerEmail}>`}</span>{' '}
                {showContactLinks && (
                  <ui.Button variant="link" className="p-0 ml-1">
                    <a href={`mailto:${pmc?.ownerEmail}`}>contact</a>
                  </ui.Button>
                )}
              </>
            )}
          </dd>
        </div>
        <div className="flex pt-2">
          <dt className="w-42 shrink-0">Funding Information:</dt>
          <dd>
            {displayGrants.length === 0 && displayFunders.length === 0 && 'None specified'}
            {displayGrants.length > 0 ? (
              <ul className="font-light list-none list-inside">
                {displayGrants.map((grant, index) => (
                  <li key={`${grant.funderKey}-${grant.grantId}-${index}`}>
                    {PMC_FUNDERS_MAP[grant.funderKey]?.name} -{' '}
                    {grant.funderKey === 'hhmi' && grant.investigatorName
                      ? grant.investigatorName
                      : grant.grantId}
                  </li>
                ))}
              </ul>
            ) : displayFunders.length > 0 ? (
              <ul className="list-disc list-inside">
                {displayFunders.map((funder) => (
                  <li key={funder}>{PMC_FUNDERS_MAP[funder]?.name}</li>
                ))}
              </ul>
            ) : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
