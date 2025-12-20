import myComplianceIcon from './assets/my-compliance-lock.svg';
import { cn } from '@curvenote/scms-core';

export function HHMIComplianceIcon({ className }: { className?: string }) {
  return (
    <img
      className={cn('w-6 h-6 brightness-0 dark:brightness-0 dark:invert', className)}
      src={myComplianceIcon}
      alt="Compliance Dashboard"
    />
  );
}
