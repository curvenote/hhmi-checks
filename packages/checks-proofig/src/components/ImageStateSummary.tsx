import { cn } from '@curvenote/scms-core';

interface ImageStateSummaryProps {
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
   * @default 5 (w-5 h-5 = 20px)
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
  10: 'w-10 h-10',
  12: 'w-12 h-12',
};

export function ImageStateSummary({ total, bad, waiting, good, size = 5 }: ImageStateSummaryProps) {
  // Create array of colors for each div
  const colors: string[] = [];

  // 1. Add bad (error) divs - custom color #9B1E1E
  for (let i = 0; i < bad; i++) {
    colors.push('bg-[#9B1E1E]');
  }

  // 2. Add waiting (warning) divs
  for (let i = 0; i < waiting; i++) {
    colors.push('bg-yellow-600');
  }

  // 3. Add good (success) divs - custom color #1B8364
  for (let i = 0; i < good; i++) {
    colors.push('bg-[#1B8364]');
  }

  // 4. Add remaining (primary) divs - blue-600
  const remaining = total - colors.length;
  for (let i = 0; i < remaining; i++) {
    colors.push('bg-blue-600');
  }

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES[5];

  return (
    <div className="flex flex-wrap gap-[2px]">
      {colors.map((colorClass, index) => (
        <div key={index} className={cn(sizeClass, colorClass)} aria-hidden="true" />
      ))}
    </div>
  );
}
