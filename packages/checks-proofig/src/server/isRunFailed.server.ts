import { proofigDataSchema } from '../schema.js';

const PROOFIG_KIND = 'proofig';

type RunRow = {
  kind: string;
  data: unknown;
};

/** True when a Proofig check run is in a retryable error state. */
export function isProofigRunFailed(run: RunRow): boolean {
  if (run.kind !== PROOFIG_KIND) return false;
  if (run.data == null || typeof run.data !== 'object') return false;
  const top = run.data as Record<string, unknown>;
  if (top.status === 'error') return true;
  const parsed = proofigDataSchema.safeParse(top.serviceData);
  if (!parsed.success || !parsed.data.stages) return false;
  return Object.values(parsed.data.stages).some((stage) => {
    if (stage == null || typeof stage !== 'object') return false;
    return (stage as { status?: string }).status === 'error';
  });
}
