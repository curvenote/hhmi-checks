import { SkeletonScientistCard } from './SkeletonScientistCard.js';

// Skeleton list component
export function SkeletonScientistList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex flex-col gap-2 p-6 border-b border-gray-200 md:items-center md:flex-row md:gap-6 dark:border-gray-700 last:border-b-0"
        >
          <SkeletonScientistCard />
        </div>
      ))}
    </>
  );
}
