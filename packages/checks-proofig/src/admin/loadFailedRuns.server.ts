import { getPrismaClient } from '@curvenote/scms-server';
import { isProofigRunFailed } from '../server/isRunFailed.server.js';
import { isProofigRunSupersededByRetry } from '../server/runSuperseded.server.js';

const PROOFIG_KIND = 'proofig';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const BATCH_SIZE = 100;
const MAX_SCAN_BATCHES = 30;

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

export type ProofigFailedRunsPage = {
  runs: ProofigFailedRunRow[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
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

type RunWithRelations = Awaited<
  ReturnType<Awaited<ReturnType<typeof getPrismaClient>>['checkServiceRun']['findMany']>
>[number] & {
  work_version: { id: string; work_id: string };
  created_by: { id: string; email: string | null; display_name: string | null } | null;
};

function mapRow(run: RunWithRelations): ProofigFailedRunRow {
  return {
    id: run.id,
    workVersionId: run.work_version_id,
    workId: run.work_version.work_id,
    dateCreated: run.date_created,
    errorSummary: summarizeProofigError(run.data),
    submitterId: run.created_by_id,
    submitterEmail: run.created_by?.email ?? null,
    submitterName: run.created_by?.display_name ?? null,
  };
}

/** Paginated list of failed Proofig runs that have not yet been retried. */
export async function loadProofigFailedRunsPage(options?: {
  page?: number;
  pageSize?: number;
}): Promise<ProofigFailedRunsPage> {
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(options?.pageSize) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;
  const need = skip + pageSize + 1;

  const prisma = await getPrismaClient();
  const matched: ProofigFailedRunRow[] = [];
  let dbOffset = 0;

  for (let batch = 0; batch < MAX_SCAN_BATCHES && matched.length < need; batch++) {
    const rows = await prisma.checkServiceRun.findMany({
      where: { kind: PROOFIG_KIND },
      orderBy: { date_created: 'desc' },
      skip: dbOffset,
      take: BATCH_SIZE,
      include: {
        work_version: { select: { id: true, work_id: true } },
        created_by: { select: { id: true, email: true, display_name: true } },
      },
    });
    if (rows.length === 0) break;
    dbOffset += rows.length;
    for (const run of rows) {
      if (isProofigRunFailed(run) && !isProofigRunSupersededByRetry(run)) {
        matched.push(mapRow(run as RunWithRelations));
      }
    }
  }

  const runs = matched.slice(skip, skip + pageSize);
  const hasNextPage = matched.length > skip + pageSize;
  return { runs, page, pageSize, hasNextPage };
}
