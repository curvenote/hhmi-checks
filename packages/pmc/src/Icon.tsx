import pmcIconBlack from './assets/pmc-icon-black.svg';
import { cn } from '@curvenote/scms-core';

interface PMCIconProps {
  className?: string;
}

export function PMCIcon({ className }: PMCIconProps) {
  return (
    <img
      className={cn('h-6 brightness-0 dark:brightness-0 dark:invert', className)}
      src={pmcIconBlack}
      alt="PMC"
    />
  );
}
