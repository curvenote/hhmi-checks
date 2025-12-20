import { buildUrl } from 'doi-utils';
import { ui, usePingEvent, cn } from '@curvenote/scms-core';
import { ExternalLink, Check, X, Sparkles } from 'lucide-react';
import { HHMITrackEvent } from '../analytics/events.js';

// ============================================================================
// Link Badges
// ============================================================================

/**
 * Context for viewing a compliance report
 * - 'own': User viewing their own report
 * - 'shared': User viewing a report shared with them
 * - 'admin': Administrator viewing a scientist's report
 */
export type ViewContext = 'own' | 'shared' | 'admin';

/**
 * Location where the link is being viewed
 * - 'list': Link clicked from the article list view
 * - 'modal': Link clicked from the publication detail modal
 */
export type ViewLocation = 'list' | 'modal';

export function JournalLinkBadge({
  doi,
  publicationId,
  publicationTitle,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  doi: string;
  publicationId: string;
  publicationTitle: string;
  size?: ui.BadgeSize;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title="Digital Object Identifier" asChild={false} delayDuration={1000}>
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={buildUrl(doi)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_DOI_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                doi,
                doiType: 'journal',
                linkUrl: buildUrl(doi),
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          Journal <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}

export function PreprintLinkBadge({
  preprintDoi,
  server,
  size,
  publicationId,
  publicationTitle,
  orcid,
  viewContext,
  viewLocation,
}: {
  preprintDoi: string;
  server?: string;
  size?: ui.BadgeSize;
  publicationId: string;
  publicationTitle: string;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip
      title={`Preprint DOI: ${preprintDoi}${server ? `; Server: ${server}` : ''}`}
      asChild={false}
      delayDuration={1000}
    >
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={buildUrl(preprintDoi)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_DOI_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                doi: preprintDoi,
                doiType: 'preprint',
                linkUrl: buildUrl(preprintDoi),
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          Preprint <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}

export function PubMedLink({
  pmid,
  publicationId,
  publicationTitle,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmid: string;
  publicationId: string;
  publicationTitle: string;
  size?: ui.ButtonProps['size'];
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title={`PMID: ${pmid}`} asChild={false} delayDuration={1000}>
      <ui.Button variant="link" size={size} asChild>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-[2px] items-center"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_PUBMED_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'PubMed',
                pmid,
                linkUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          PubMed
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Button>
    </ui.SimpleTooltip>
  );
}

export function PubMedLinkBadge({
  pmid,
  publicationId,
  publicationTitle,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmid: string;
  publicationId: string;
  publicationTitle: string;
  size?: ui.BadgeSize;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title={`PMID: ${pmid}`} asChild={false} delayDuration={1000}>
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_PUBMED_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'PubMed',
                pmid,
                linkUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          PubMed
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}

export function PMCLinkBadge({
  pmcid,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmcid: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.BadgeSize;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip
      title={`PubMed Central Identifier: ${pmcid}`}
      asChild={false}
      delayDuration={1000}
    >
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_PMC_LINK_CLICKED,
              {
                publicationId,
                pmcid,
                publicationTitle,
                linkType: 'PMC',
                linkUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          PMC
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}

export function PMCLink({
  pmcid,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmcid: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.ButtonProps['size'];
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip
      title={`PubMed Central Identifier: ${pmcid}`}
      asChild={false}
      delayDuration={1000}
    >
      <ui.Button variant="link" size={size} asChild>
        <a
          href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-[2px] items-center"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_PMC_LINK_CLICKED,
              {
                publicationId,
                pmcid,
                publicationTitle,
                linkType: 'PMC',
                linkUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          PubMed Central
          <ExternalLink />
        </a>
      </ui.Button>
    </ui.SimpleTooltip>
  );
}

export function CurvenotePMCLinkBadge({
  pmcid,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmcid: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.BadgeSize;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title="Enhanced PMC" asChild={false} delayDuration={1000}>
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={`https://overlay.curvenote.dev/${pmcid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PMC_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'Enhanced PMC',
                pmcid,
                linkUrl: `https://overlay.curvenote.dev/${pmcid}`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          <Sparkles className="w-3 h-3" />
          Enhanced PMC
          <sup className="text-[8px] font-bold ml-0.5">BETA</sup>
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}
export function CurvenotePMCLink({
  pmcid,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  pmcid: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.ButtonProps['size'];
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title="Enhanced PMC" asChild={false} delayDuration={1000}>
      <ui.Button variant="link" size={size} asChild>
        <a
          href={`https://overlay.curvenote.dev/${pmcid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-[2px] items-center"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PMC_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'Enhanced PMC',
                pmcid,
                linkUrl: `https://overlay.curvenote.dev/${pmcid}`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          <Sparkles className="w-3 h-3" />
          Enhanced PMC
          <sup className="text-[8px] font-bold ml-0.5">BETA</sup>
          <ExternalLink />
        </a>
      </ui.Button>
    </ui.SimpleTooltip>
  );
}

export function CurvenotePreprintLinkBadge({
  preprintDoi,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  preprintDoi: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.BadgeSize;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title="Enhanced Preprint" asChild={false} delayDuration={1000}>
      <ui.Badge variant="outline" size={size} asChild>
        <a
          href={`https://overlay.curvenote.dev/doi/${preprintDoi}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PREPRINT_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'Enhanced Preprint',
                preprintDoi,
                linkUrl: `https://overlay.curvenote.dev/doi/${preprintDoi}`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          <Sparkles className="w-3 h-3" />
          Enhanced Preprint
          <sup className="text-[8px] font-bold ml-0.5">BETA</sup>
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Badge>
    </ui.SimpleTooltip>
  );
}

export function CurvenotePreprintLink({
  preprintDoi,
  publicationTitle,
  publicationId,
  size,
  orcid,
  viewContext,
  viewLocation,
}: {
  preprintDoi: string;
  publicationTitle: string;
  publicationId: string;
  size?: ui.ButtonProps['size'];
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  const pingEvent = usePingEvent();

  return (
    <ui.SimpleTooltip title="Enhanced Preprint" asChild={false} delayDuration={1000}>
      <ui.Button variant="link" size={size} asChild>
        <a
          href={`https://overlay.curvenote.dev/doi/${preprintDoi}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-[2px] items-center"
          onClick={() =>
            pingEvent(
              HHMITrackEvent.HHMI_COMPLIANCE_ENHANCED_PREPRINT_LINK_CLICKED,
              {
                publicationId,
                publicationTitle,
                linkType: 'Enhanced Preprint',
                preprintDoi,
                linkUrl: `https://overlay.curvenote.dev/doi/${preprintDoi}`,
                orcid,
                viewContext,
                viewLocation,
              },
              { anonymous: true },
            )
          }
        >
          <Sparkles className="w-3 h-3" />
          Enhanced Preprint
          <sup className="text-[8px] font-bold ml-0.5">BETA</sup>
          <ExternalLink className="w-3 h-3" />
        </a>
      </ui.Button>
    </ui.SimpleTooltip>
  );
}

// ============================================================================
// Status Badges
// ============================================================================

export function ComplianceBadge({
  compliant,
  reason,
  size,
  onClick,
  isMajorContributor,
}: {
  compliant: boolean;
  reason?: string;
  size?: ui.BadgeSize;
  onClick?: () => void;
  isMajorContributor?: boolean;
}) {
  const tooltipTitle = reason;
  const variant = compliant && isMajorContributor ? 'success' : 'outline';
  const icon = compliant ? (
    <Check className="w-3 h-3 text-success" />
  ) : (
    <X className="w-3 h-3 text-destructive" />
  );
  const text = compliant ? 'Compliant' : 'Non-compliant';

  const badge = (
    <ui.Badge
      variant={variant}
      size={size}
      className={cn({
        'bg-red-100': !compliant && isMajorContributor,
        'bg-gray-50 border-gray-200 text-gray-500': !isMajorContributor,
        'cursor-pointer': onClick,
      })}
      onClick={onClick}
    >
      {icon}
      {text}
    </ui.Badge>
  );

  if (tooltipTitle === undefined) return badge;

  return (
    <ui.SimpleTooltip title={tooltipTitle ?? ''} asChild={false} delayDuration={1000}>
      {badge}
    </ui.SimpleTooltip>
  );
}
