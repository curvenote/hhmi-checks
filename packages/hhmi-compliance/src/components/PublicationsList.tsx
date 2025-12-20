// import type { NormalizedArticleRecord } from '../backend/types';
// import { Card } from '@curvenote/scms-core';

// interface PublicationsListProps {
//   publications: NormalizedArticleRecord[];
// }

// export function PublicationsList({ publications }: PublicationsListProps) {
//   // Group publications by year
//   const publicationsByYear = publications.reduce(
//     (acc, publication) => {
//       const year = publication.year || 'Unknown';
//       if (!acc[year]) {
//         acc[year] = [];
//       }
//       acc[year].push(publication);
//       return acc;
//     },
//     {} as Record<string, NormalizedArticleRecord[]>,
//   );

//   // Sort years in descending order
//   const sortedYears = Object.keys(publicationsByYear).sort((a, b) => {
//     if (a === 'Unknown') return 1;
//     if (b === 'Unknown') return -1;
//     return parseInt(b) - parseInt(a);
//   });

//   return (
//     <Card className="p-0 border rounded-sm bg-background">
//       {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
//       {sortedYears.map((year, yearIndex) => (
//         <div key={year}>
//           {/* Year Header */}
//           <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
//             <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{year}</h3>
//           </div>

//           {/* Publications for this year */}
//           <div>
//             {publicationsByYear[year].map((publication, index) => (
//               <PublicationCard key={publication.id || index} publication={publication} />
//             ))}
//           </div>
//         </div>
//       ))}
//     </Card>
//   );
// }
