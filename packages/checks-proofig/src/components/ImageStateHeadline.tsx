interface ImageStateHeadlineProps {
  /**
   * Total number of images
   */
  total: number;
  /**
   * Number of images with issues/failures
   */
  bad: number;
  /**
   * Number of images waiting for review or processing
   */
  waiting: number;
  /**
   * Number of images that passed checks
   */
  good: number;
}

export function ImageStateHeadline({ total, bad, waiting, good }: ImageStateHeadlineProps) {
  // Determine which state to show
  const isAllClear = bad === 0 && waiting === 0;
  const hasOnlyConfirmedProblems = bad > 0 && waiting === 0;

  // State 1: All Clear (when bad + waiting == 0)
  if (isAllClear) {
    return (
      <div className="space-y-1">
        <div className="text-3xl font-medium text-[#1B8364]">All Clear</div>
        <div className="text-base font-bold">
          {good > 0
            ? `${good}/${total} figures were flagged as suspicious, but approved by you`
            : 'No issues detected with your figures'}
        </div>
      </div>
    );
  }

  // State 2: Confirmed Problems (when bad > 0 and waiting == 0)
  if (hasOnlyConfirmedProblems) {
    return (
      <div className="space-y-1">
        <div className="text-3xl font-medium text-[#9B1E1E]">
          {bad} {bad === 1 ? 'Problem' : 'Problems'}
        </div>
        <div className="text-base font-bold">
          {bad} {bad === 1 ? 'figure' : 'figures'} were confirmed as problematic
        </div>
      </div>
    );
  }

  // State 3: Ratio (otherwise - has waiting items)
  const flagged = waiting + good;
  return (
    <div className="space-y-1">
      <div className="text-3xl font-medium text-gray-900 dark:text-gray-100">
        {bad + waiting}
        <span className="font-extralight text-gray-500">/{total}</span>
      </div>
      <div className="text-base font-bold">
        {bad > 0 && waiting > 0 && (
          <>
            {bad} {bad === 1 ? 'figure' : 'figures'} marked problematic, {waiting}{' '}
            {good > 0 ? 'still ' : ''}waiting on review
          </>
        )}
        {bad === 0 && waiting > 0 && (
          <>
            {flagged} {flagged === 1 ? 'figure was' : 'figures were'} flagged as suspicious
            {good > 0
              ? `, ${waiting} ${good > 0 ? 'still ' : ''}waiting on review`
              : ' and waiting on review'}
          </>
        )}
        {bad > 0 && waiting === 0 && (
          <>
            {bad} {bad === 1 ? 'figure' : 'figures'} marked problematic
          </>
        )}
      </div>
    </div>
  );
}
