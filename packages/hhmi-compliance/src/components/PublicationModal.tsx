import { X, ExternalLink, Check } from 'lucide-react';
import type { NormalizedArticleRecord } from '../backend/types.js';
import { buildUrl } from 'doi-utils';
import { cn, formatDate, usePingEvent, ui } from '@curvenote/scms-core';
import { HHMITrackEvent } from '../analytics/events.js';
import { PublicationLinks } from './PublicationCard.js';
import { RequestHelpDialog, type HelpRequestPublication } from '@curvenote/scms-core';
import { useState } from 'react';
import { formatLicenseForDisplay } from '../utils/licenseFormatting.js';
import type { ViewContext } from './Badges.js';

/*
  2007 Public Access to Publications policy: https://hhmicdn.blob.core.windows.net/policies/Public-Access-to-Publications.pdf
  2022 Open Access to Publications policy: https://hhmicdn.blob.core.windows.net/policies/Open-Access-To-Publications-Policy.pdf
  2026 Immediate Access to Research policy: https://hhmicdn.blob.core.windows.net/policies/Immediate-Access-to-Research.pdf
 */
const POLICY_URLS = {
  '2007_PAPP': 'https://hhmicdn.blob.core.windows.net/policies/Public-Access-to-Publications.pdf',
  '2022_OAPP':
    'https://hhmicdn.blob.core.windows.net/policies/Open-Access-To-Publications-Policy.pdf',
  '2026_IAR': 'https://hhmicdn.blob.core.windows.net/policies/Immediate-Access-to-Research.pdf',
};

function PolicyLink({ policy }: { policy?: string }) {
  const pingEvent = usePingEvent();

  const handlePolicyClick = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_POLICY_OPENED,
      {
        policyType: policy,
        policyUrl: POLICY_URLS[policy as keyof typeof POLICY_URLS],
      },
      { anonymous: true },
    );
  };

  if (!policy) return null;

  let policyUrl: string | undefined;
  let policyName: string | undefined;
  if (policy.includes('2007')) {
    policyUrl = POLICY_URLS['2007_PAPP'];
    policyName = '2007 Public Access to Publications Policy';
  } else if (policy.includes('2022')) {
    policyUrl = POLICY_URLS['2022_OAPP'];
    policyName = '2022 Open Access to Publications Policy';
  } else if (policy.includes('2026')) {
    policyUrl = POLICY_URLS['2026_IAR'];
    policyName = '2026 Immediate Access to Research Policy';
  }

  if (!policyUrl) return <div>Could not find policy URL for {policy}</div>;

  return (
    <a
      href={policyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
      onClick={handlePolicyClick}
    >
      {policyName}
      <ExternalLink className="inline-block w-4 h-4 ml-1" />
    </a>
  );
}

interface PublicationModalProps {
  item: NormalizedArticleRecord | null;
  isOpen: boolean;
  onClose: () => void;
  showComplianceStatusBar?: boolean;
  orcid: string;
  viewContext: ViewContext;
}

function Item({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-baseline">
      <dt className="font-medium text-foreground min-w-[190px] flex-shrink-0 mt-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ComplianceStatusBar({ item }: { item: NormalizedArticleRecord }) {
  return (
    <div
      className={cn('flex gap-2 p-2 rounded-sm border flex flex-col gap-2', {
        'border-success': item.compliant,
        'border-warning': !item.compliant,
      })}
    >
      {item.compliant && !item.everNonCompliant && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center flex-shrink-0 gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-success shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <div className="font-bold whitespace-nowrap text-medium">Compliant</div>
            </div>
            <div className="font-light text-medium">
              (<PolicyLink policy={item.topLevelPolicy} />)
            </div>
          </div>
          {item.isLinkedToPrimaryOrcid && (
            <div className="text-sm font-light">
              You are a major contributor on this publication.
            </div>
          )}
          {!item.isLinkedToPrimaryOrcid && (
            <div className="text-sm font-light">
              You are not a major contributor on this publication.
            </div>
          )}
        </>
      )}
      {!item.compliant && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center flex-shrink-0 gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-warning shrink-0">
                <X className="w-3 h-3 text-white" />
              </div>
              <div className="font-bold whitespace-nowrap text-medium">
                {item.preprint?.complianceIssueStatus ?? item.journal?.complianceIssueStatus}
              </div>
            </div>
            <div className="font-light text-medium">
              Non-compliant with <PolicyLink policy={item.topLevelPolicy} />
            </div>
          </div>
          {item.isLinkedToPrimaryOrcid && (
            <>
              <div className="text-sm font-light">
                You are a major contributor on this publication and{' '}
                <span className="font-medium">
                  you should take steps to resolve this compliance issue.
                </span>
              </div>
            </>
          )}
          {!item.isLinkedToPrimaryOrcid && (
            <div className="text-sm font-light">
              Because you are not a major contributor on this publication, this compliance issue
              will not affect your next review and{' '}
              <span className="font-medium">you are not required to take action</span>.
            </div>
          )}
          <>
            {item.preprint?.actionSteps && (
              <div className="text-sm font-light">
                <span className="font-semibold">Preprint:</span> {item.preprint.actionSteps}
              </div>
            )}
            {item.journal?.actionSteps && (
              <div className="text-sm font-light">
                <span className="font-semibold">Journal Article:</span> {item.journal.actionSteps}
              </div>
            )}
          </>
        </>
      )}
      {item.compliant && item.everNonCompliant && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center flex-shrink-0 gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-success shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <div className="font-bold whitespace-nowrap text-medium">
                Policy issues were resolved
                {item.dateResolved ? ` on ${formatDate(item.dateResolved)}` : ''}
              </div>
            </div>
            <div className="font-light text-medium">
              <PolicyLink policy={item.topLevelPolicy} />
            </div>
          </div>
          {item.isLinkedToPrimaryOrcid && (
            <div className="text-sm font-light">
              You are a major contributor on this publication.
            </div>
          )}
          {!item.isLinkedToPrimaryOrcid && (
            <div className="text-sm font-light">
              You are not a major contributor on this publication.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PublicationModal({
  item: pub,
  isOpen,
  onClose,
  showComplianceStatusBar = true,
  orcid,
  viewContext,
}: PublicationModalProps) {
  const pingEvent = usePingEvent();
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  if (!pub) return null;

  const handlePreprintDOIClick = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_DOI_LINK_CLICKED,
      {
        publicationId: pub.id,
        publicationTitle: pub.title,
        doi: pub.preprint?.doi,
        doiType: 'preprint',
        linkUrl: buildUrl(pub.preprint?.doi ?? ''),
        orcid,
        viewContext,
        viewLocation: 'modal',
      },
      { anonymous: true },
    );
  };

  const handleJournalDOIClick = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_DOI_LINK_CLICKED,
      {
        publicationId: pub.id,
        publicationTitle: pub.title,
        doi: pub.journal?.doi,
        doiType: 'journal',
        linkUrl: buildUrl(pub.journal?.doi ?? ''),
        orcid,
        viewContext,
        viewLocation: 'modal',
      },
      { anonymous: true },
    );
  };

  const handleJournalURLClick = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_URL_LINK_CLICKED,
      {
        publicationId: pub.id,
        publicationTitle: pub.title,
        urlType: 'journal',
        linkUrl: pub.journal?.url,
        orcid,
        viewContext,
        viewLocation: 'modal',
      },
      { anonymous: true },
    );
  };

  const handlePreprintURLClick = () => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_URL_LINK_CLICKED,
      {
        publicationId: pub.id,
        publicationTitle: pub.title,
        urlType: 'preprint',
        linkUrl: pub.preprint?.url,
        orcid,
        viewContext,
        viewLocation: 'modal',
      },
      { anonymous: true },
    );
  };

  const trackModalClose = (closeMethod: string) => {
    pingEvent(
      HHMITrackEvent.HHMI_COMPLIANCE_PUBLICATION_MODAL_CLOSED,
      {
        publicationId: pub.id,
        publicationTitle: pub.title,
        closeMethod,
      },
      { anonymous: true },
    );
  };

  const handleCloseButtonClick = () => {
    trackModalClose('close-button');
    onClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      trackModalClose('click-outside-or-escape');
      onClose();
    }
  };

  const handleHelpDialogClose = (open: boolean) => {
    if (!open) {
      pingEvent(
        HHMITrackEvent.HHMI_COMPLIANCE_HELP_MODAL_CLOSED,
        {
          publicationId: pub.id,
          publicationTitle: pub.title,
          context: 'publication-modal',
          closeMethod: 'click-outside-or-escape',
        },
        { anonymous: true },
      );
    }
    setShowHelpDialog(open);
  };

  return (
    <ui.Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <ui.DialogContent variant="wide">
        <ui.DialogHeader>
          <ui.DialogTitle className="flex items-center justify-between">
            <span className="pr-8">Publication Details</span>
          </ui.DialogTitle>
        </ui.DialogHeader>

        <div className="space-y-6">
          {/* Title and Authors Section */}
          <div>
            <h2 className="mb-2 text-2xl font-semibold">{pub.title || 'Untitled Publication'}</h2>
            {pub.authors && pub.authors.length > 0 && (
              <p className="text-sm text-muted-foreground">{pub.authors.join(', ')}</p>
            )}
            {(pub.journal?.date || pub.preprint?.date) && (
              <div className="text-sm text-muted-foreground">
                {formatDate(pub.journal?.date ?? pub.preprint?.date ?? '')}
              </div>
            )}
          </div>
          <PublicationLinks
            publication={pub}
            orcid={orcid}
            viewContext={viewContext}
            viewLocation="modal"
          />

          {/* Compliance Status Bar */}
          {showComplianceStatusBar && <ComplianceStatusBar item={pub} />}

          {/* Detailed Information List */}
          <div className="space-y-4">
            {/* General Publication IDs */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                Publication Identifiers
              </h3>
              <dl className="flex flex-col gap-2 py-2 max-w-none">
                <Item
                  label="PubMed ID"
                  value={
                    pub.pmid ? (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        onClick={() =>
                          pingEvent(
                            HHMITrackEvent.HHMI_COMPLIANCE_PUBMED_LINK_CLICKED,
                            {
                              publicationId: pub.id,
                              publicationTitle: pub.title,
                              linkType: 'PubMed',
                              pmid: pub.pmid,
                              linkUrl: `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`,
                              orcid,
                              viewContext,
                              viewLocation: 'modal',
                            },
                            { anonymous: true },
                          )
                        }
                      >
                        {pub.pmid}
                      </a>
                    ) : (
                      'Not available'
                    )
                  }
                />
                <Item
                  label="PubMed Central ID"
                  value={
                    pub.pmcid ? (
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pub.pmcid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        onClick={() =>
                          pingEvent(
                            HHMITrackEvent.HHMI_COMPLIANCE_PMC_LINK_CLICKED,
                            {
                              publicationId: pub.id,
                              publicationTitle: pub.title,
                              linkType: 'PMC',
                              pmcid: pub.pmcid,
                              linkUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pub.pmcid}/`,
                              orcid,
                              viewContext,
                              viewLocation: 'modal',
                            },
                            { anonymous: true },
                          )
                        }
                      >
                        {pub.pmcid}
                      </a>
                    ) : (
                      'Not available'
                    )
                  }
                />
              </dl>
            </div>

            {/* Journal Publication Information */}
            {pub.journal && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Journal Publication
                </h3>
                <dl className="flex flex-col gap-2 py-2 max-w-none">
                  {pub.journal.date && (
                    <Item label="Publication Date" value={formatDate(pub.journal.date)} />
                  )}
                  {pub.journal.doi && (
                    <Item
                      label="DOI"
                      value={
                        <a
                          href={buildUrl(pub.journal.doi)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          onClick={handleJournalDOIClick}
                        >
                          {pub.journal.doi}
                        </a>
                      }
                    />
                  )}
                  {pub.journal.publisher && (
                    <Item label="Publisher" value={pub.journal.publisher} />
                  )}
                  {pub.journal.license && (
                    <Item label="License" value={formatLicenseForDisplay(pub.journal.license)} />
                  )}
                  {pub.journal.url && (
                    <Item
                      label="URL"
                      value={
                        <a
                          href={pub.journal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline break-all"
                          onClick={handleJournalURLClick}
                        >
                          {pub.journal.url}
                        </a>
                      }
                    />
                  )}
                  {pub.journal.complianceIssueType && (
                    <Item label="Issue Type" value={pub.journal.complianceIssueType} />
                  )}
                  {pub.journal.complianceIssueStatus && (
                    <Item label="Issue Status" value={pub.journal.complianceIssueStatus} />
                  )}
                </dl>
              </div>
            )}

            {/* Preprint Information */}
            {pub.preprint && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Preprint Information
                </h3>
                <dl className="flex flex-col gap-2 py-2 max-w-none">
                  {pub.preprint.date && (
                    <Item label="Posted Date" value={formatDate(pub.preprint.date)} />
                  )}
                  {pub.preprint.doi && (
                    <Item
                      label="DOI"
                      value={
                        <a
                          href={buildUrl(pub.preprint.doi)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          onClick={handlePreprintDOIClick}
                        >
                          {pub.preprint.doi}
                        </a>
                      }
                    />
                  )}
                  {pub.preprint.server && <Item label="Repository" value={pub.preprint.server} />}
                  {pub.preprint.license && (
                    <Item label="License" value={formatLicenseForDisplay(pub.preprint.license)} />
                  )}
                  {pub.preprint.url && (
                    <Item
                      label="URL"
                      value={
                        <a
                          href={pub.preprint.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline break-all"
                          onClick={handlePreprintURLClick}
                        >
                          {pub.preprint.url}
                        </a>
                      }
                    />
                  )}
                  {pub.preprint.complianceIssueType && (
                    <Item label="Issue Type" value={pub.preprint.complianceIssueType} />
                  )}
                  {pub.preprint.complianceIssueStatus && (
                    <Item label="Issue Status" value={pub.preprint.complianceIssueStatus} />
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-end justify-end gap-3 pt-4 border-gray-200 dark:border-gray-700">
            <ui.Button onClick={handleCloseButtonClick} variant="outline">
              Close
            </ui.Button>
            <ui.Button
              onClick={() => {
                pingEvent(
                  HHMITrackEvent.HHMI_COMPLIANCE_HELP_REQUESTED,
                  {
                    publicationId: pub.id,
                    publicationTitle: pub.title,
                    context: 'publication-modal',
                  },
                  { anonymous: true },
                );
                setShowHelpDialog(true);
              }}
            >
              Request Help
            </ui.Button>
          </div>
        </div>
      </ui.DialogContent>
      <RequestHelpDialog
        publication={pub as HelpRequestPublication}
        orcid={orcid}
        open={showHelpDialog}
        onOpenChange={handleHelpDialogClose}
        title="Request Help from the Open Science Team"
        successMessage="Your request has been sent to the HHMI Open Science Team. We'll get back to you as soon as possible."
      />
    </ui.Dialog>
  );
}
