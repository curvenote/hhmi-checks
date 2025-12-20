import { cn } from '@curvenote/scms-core';

interface CompactImageStateLegendProps {
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
  /**
   * Size of each square div (Tailwind size class number)
   * @default 3 (w-3 h-3 = 12px)
   */
  size?: number;
}

// Size class mapping for Tailwind CSS (needed for proper purging/JIT)
const SIZE_CLASSES: Record<number, string> = {
  2: 'w-2 h-2',
  3: 'w-3 h-3',
  4: 'w-4 h-4',
  5: 'w-5 h-5',
  6: 'w-6 h-6',
  8: 'w-8 h-8',
};

export function CompactImageStateLegend({
  total,
  bad,
  waiting,
  good,
  size = 3,
}: CompactImageStateLegendProps) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES[3];
  const awaitingReview = waiting - (bad + good);

  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <div className="flex gap-1 items-center">
        <div className={cn(sizeClass, 'bg-[#9B1E1E]')} />
        <span>{bad} confirmed problems</span>
      </div>
      <div className="flex gap-1 items-center">
        <div className={cn(sizeClass, 'bg-yellow-600')} />
        <span>{awaitingReview} awaiting review</span>
      </div>
      <div className="flex gap-1 items-center">
        <div className={cn(sizeClass, 'bg-[#1B8364]')} />
        <span>{good} marked fine</span>
      </div>
      <div className="flex gap-1 items-center">
        <div className={cn(sizeClass, 'bg-blue-600')} />
        <span>{total} total images</span>
      </div>
    </div>
  );
}
