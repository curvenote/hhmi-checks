export type RetryCronDisplaySnapshot = {
  installed: boolean;
  cronJob?: {
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    targetUrl: string | null;
    targetScope: string | null;
    lastRunAt: string | null;
    lastStatus: string | null;
    nextRunAt: string | null;
  };
};

/** Prefer install response only while status still reports not installed. */
export function resolveRetryCronDisplaySnapshot(
  statusRetryCron: RetryCronDisplaySnapshot | undefined,
  installRetryCron: RetryCronDisplaySnapshot | undefined,
): RetryCronDisplaySnapshot | undefined {
  const preferInstallSnapshot =
    installRetryCron?.installed === true && statusRetryCron?.installed !== true;
  return preferInstallSnapshot ? installRetryCron : (statusRetryCron ?? installRetryCron);
}
