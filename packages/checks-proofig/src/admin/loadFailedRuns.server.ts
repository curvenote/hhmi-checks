import { getPrismaClient } from '@curvenote/scms-server';
import { isProofigRunFailed } from '../server/isRunFailed.server.js';

const PROOFIG_KIND = 'proofig';
const DEFAULT_LIMIT = 50;
const FETCH_MULTIPLIER = 4;

export type ProofigFailedRunRow = {
  id: string;
  workVersionId: string;
  workId: string;
  dateCreated: string;
  errorSummary: string;
  submitterId: string | null;
  submitterEmail: string | null;
  submitterName: string | null;
};

function summarizeProofigError(data: unknown): string {
  if (data == null || typeof data !== 'object') return 'Unknown error';
  const top = data as Record<string, unknown>;
  const serviceData = top.serviceData;
  if (serviceData != null && typeof serviceData === 'object') {
    const stages = (serviceData as { stages?: Record<string, { error?: string; status?: string }> })
      .stages;
    if (stages) {
      for (const stage of Object.values(stages)) {
        if (stage?.status === 'error' && stage.error?.trim()) {
          return stage.error.trim();
        }
      }
    }
  }
  return 'Check failed';
}

/** List recent failed Proofig runs for admin retry tooling. */
export async function loadProofigFailedRuns(limit = DEFAULT_LIMIT): Promise<ProofigFailedRunRow[]> {
  const prisma = await getPrismaClient();
  const runs = await prisma.checkServiceRun.findMany({
    where: { kind: PROOFIG_KIND },
    orderBy: { date_created: 'desc' },
    take: limit * FETCH_MULTIPLIER,
    include: {
      work_version: { select: { id: true, work_id: true } },
      created_by: { select: { id: true, email: true, display_name: true } },
    },
  });

  return runs
    .filter((run) => isProofigRunFailed(run))
    .slice(0, limit)
    .map((run) => ({
      id: run.id,
      workVersionId: run.work_version_id,
      workId: run.work_version.work_id,
      dateCreated: run.date_created,
      errorSummary: summarizeProofigError(run.data),
      submitterId: run.created_by_id,
      submitterEmail: run.created_by?.email ?? null,
      submitterName: run.created_by?.display_name ?? null,
    }));
}
