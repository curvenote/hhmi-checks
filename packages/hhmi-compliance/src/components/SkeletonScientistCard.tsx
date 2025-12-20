// Skeleton component that matches the scientist card layout
export function SkeletonScientistCard() {
  return (
    <>
      {/* Scientist Info Skeleton */}
      <div className="flex flex-row flex-1 gap-2 items-center lg:items-start lg:flex-col">
        <div className="flex gap-3 items-center lg:mb-2">
          {/* Name skeleton */}
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
        </div>
        <div className="flex flex-col gap-2 text-sm md:flex-row lg:gap-6">
          {/* Email skeleton */}
          <div className="flex gap-2 items-center">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="hidden w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700 lg:block"></div>
          </div>
          {/* ORCID skeleton */}
          <div className="flex gap-2 items-center">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="hidden w-20 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700 lg:block"></div>
          </div>
        </div>
      </div>

      {/* Compliance Stats Skeleton */}
      <div className="flex-shrink-0 space-y-1 md:text-right">
        <div className="text-lg">
          {/* Compliance rate skeleton */}
          <div className="ml-auto w-16 h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
        </div>
        <div className="text-sm space-children">
          {/* Compliance details skeleton */}
          <div className="ml-auto w-24 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
        </div>
      </div>

      {/* Action Button Skeleton */}
      <div className="flex-shrink-0">
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
      </div>
    </>
  );
}
