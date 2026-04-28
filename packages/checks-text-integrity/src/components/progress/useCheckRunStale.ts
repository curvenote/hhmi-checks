import { useEffect, useMemo, useState } from 'react';

/** If the check run row was not updated within this window, show refresh / stale UI. */
const STALE_AFTER_MS = 30_000;
/** Recompute “now vs last modified” periodically so the UI flips without a navigation. */
const STALE_RECHECK_MS = 5000;

/**
 * True when `checkRunDateModified` (ISO from `CheckServiceRun.date_modified`) is older than
 * {@link STALE_AFTER_MS} relative to the current time.
 */
export function useCheckRunStale(checkRunDateModified: string | undefined): boolean {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!checkRunDateModified) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, STALE_RECHECK_MS);
    return () => window.clearInterval(id);
  }, [checkRunDateModified]);

  return useMemo(() => {
    if (!checkRunDateModified) return false;
    const modifiedMs = new Date(checkRunDateModified).getTime();
    if (Number.isNaN(modifiedMs)) return false;
    return Date.now() - modifiedMs > STALE_AFTER_MS;
  }, [checkRunDateModified, tick]);
}
