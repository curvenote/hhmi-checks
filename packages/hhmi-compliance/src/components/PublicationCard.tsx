import type { NormalizedArticleRecord } from '../backend/types.js';
import {
  JournalLinkBadge,
  PreprintLinkBadge,
  PubMedLinkBadge,
  PMCLinkBadge,
  CurvenotePMCLinkBadge,
  CurvenotePreprintLinkBadge,
  type ViewContext,
  type ViewLocation,
} from './Badges.js';
import { isCCBY } from '../utils/licenseFormatting.js';

// interface PublicationCardProps {
//   publication: NormalizedArticleRecord;
// }

export function PublicationLinks({
  publication: pub,
  orcid,
  viewContext,
  viewLocation,
}: {
  publication?: NormalizedArticleRecord;
  orcid?: string;
  viewContext: ViewContext;
  viewLocation: ViewLocation;
}) {
  if (!pub) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
      {pub.journal?.doi && (
        <JournalLinkBadge
          doi={pub.journal.doi}
          publicationId={pub.id}
          publicationTitle={pub.journal.title ?? ''}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
      {pub.preprint?.doi && (
        <PreprintLinkBadge
          preprintDoi={pub.preprint.doi}
          publicationId={pub.id}
          publicationTitle={pub.title ?? ''}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
      {pub.pmid && (
        <PubMedLinkBadge
          pmid={pub.pmid}
          publicationTitle={pub.title ?? ''}
          publicationId={pub.id}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
      {pub.pmcid && (
        <PMCLinkBadge
          pmcid={pub.pmcid}
          publicationId={pub.id}
          publicationTitle={pub.title ?? ''}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
      {pub.pmcid && isCCBY(pub.journal?.license) && (
        <CurvenotePMCLinkBadge
          pmcid={pub.pmcid}
          publicationId={pub.id}
          publicationTitle={pub.title ?? ''}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
      {pub.preprint?.doi && pub.preprint.doi.includes('10.1101/') && (
        <CurvenotePreprintLinkBadge
          preprintDoi={pub.preprint.doi}
          publicationId={pub.id}
          publicationTitle={pub.title ?? ''}
          orcid={orcid}
          viewContext={viewContext}
          viewLocation={viewLocation}
        />
      )}
    </div>
  );
}

// export function PublicationCard({ publication: pub }: PublicationCardProps) {
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const handleModalOpen = () => {
//     setIsModalOpen(true);
//   };

//   const title = pub.title || 'Untitled';
//   const hasPreprint = pub.preprintDoi || pub.hasPreprintCopy;

//   return (
//     <>
//       <div className="flex flex-col items-start gap-2 p-6 border-b border-gray-200 md:gap-6 md:flex-row dark:border-gray-700 last:border-b-0">
//         {/* Publication Details (Left Column) */}
//         <div className="flex-1">
//           <div className="flex items-start gap-2">
//             <h3
//               className="font-medium leading-tight transition-colors cursor-pointer line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400"
//               onClick={handleModalOpen}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' || e.key === ' ') {
//                   e.preventDefault();
//                   handleModalOpen();
//                 }
//               }}
//               tabIndex={0}
//               role="button"
//               aria-label={`View details for ${title}`}
//             >
//               {title}
//             </h3>
//           </div>
//           <PublicationLinks publication={pub} />
//         </div>

//         {/* Funding and Compliance Status (Middle Column) */}
//         <div className="flex-shrink-0 w-48">
//           <div className="flex flex-wrap gap-1">
//             {(pub.publisherLicenseBest === 'cc-by' || pub.repositoryLicenseBest === 'cc-by') && (
//               <CCBYBadge />
//             )}
//             {((pub.publisherLicenseBest && pub.publisherLicenseBest !== 'cc-by') ||
//               (pub.repositoryLicenseBest && pub.repositoryLicenseBest !== 'cc-by')) && (
//               <NotCCBYBadge license={pub.publisherLicenseBest || pub.repositoryLicenseBest || ''} />
//             )}
//             {pub.pmcid && <OnPMCBadge />}
//             {hasPreprint && <HasPreprintBadge />}
//             {pub.compliance.compliant === false && pub.compliance.resolved === false && (
//               <NonCompliantBadge policy={pub.compliance.policy} />
//             )}
//           </div>
//         </div>

//         {/* Review Status (Right Column) */}
//         <div className="flex-shrink-0 w-48">
//           {pub.compliance.compliant === true && (
//             <CompliantBadge policy={pub.compliance.policy} reason={pub.compliance.reason} />
//           )}
//           {pub.compliance.compliant === false &&
//             !pub.compliance.resolved &&
//             pub.compliance.status && <StatusBadge status={pub.compliance.status} />}
//           {pub.compliance.compliant === false &&
//             !pub.compliance.resolved &&
//             !pub.compliance.status && <NonCompliantBadge policy={pub.compliance.policy} />}
//           {pub.compliance.compliant === false && pub.compliance.resolved && (
//             <ResolvedBadge locationResolved={pub.compliance.locationResolved} />
//           )}
//         </div>
//       </div>

//       <PublicationModal
//         publication={pub}
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//       />
//     </>
//   );
// }
