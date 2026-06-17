import { getPrismaClient } from '@curvenote/scms-server';
import { getErrorMessage } from '../serviceDataSchemas.js';
import { isTextIntegrityRunFailed } from '../server/isRunFailed.server.js';

const TEXT_INTEGRITY_KIND = 'checks-text-integrity';
const DEFAULT_LIMIT = 50;
const FETCH_MULTIPLIER = 4;

export type TextIntegrityFailedRunRow = {
  id: string;
  workVersionId: string;
  workId: string;
  dateCreated: string;
  errorSummary: string;
  submitterId: string | null;
  submitterEmail: string | null;
  submitterName: string | null;
};

function summarizeTextIntegrityError(data: unknown): string {
  if (data == null || typeof data !== 'object') return 'Unknown error';
  const top = data as Record<string, unknown>;
  const serviceData = top.serviceData;
  if (serviceData != null && typeof serviceData === 'object') {
    const message = getErrorMessage(serviceData as Parameters<typeof getErrorMessage>[0]);
    if (message?.trim()) return message.trim();
  }
  return 'Check failed';
}

/** List recent failed Text Integrity runs for admin retry tooling. */
export async function loadTextIntegrityFailedRuns(
  limit = DEFAULT_LIMIT,
): Promise<TextIntegrityFailedRunRow[]> {
  const prisma = await getPrismaClient();
  const runs = await prisma.checkServiceRun.findMany({
    where: { kind: TEXT_INTEGRITY_KIND },
    orderBy: { date_created: 'desc' },
    take: limit * FETCH_MULTIPLIER,
    include: {
      work_version: { select: { id: true, work_id: true } },
      created_by: { select: { id: true, email: true, display_name: true } },
    },
  });

  return runs
    .filter((run) => isTextIntegrityRunFailed(run))
    .slice(0, limit)
    .map((run) => ({
      id: run.id,
      workVersionId: run.work_version_id,
      workId: run.work_version.work_id,
      dateCreated: run.date_created,
      errorSummary: summarizeTextIntegrityError(run.data),
      submitterId: run.created_by_id,
      submitterEmail: run.created_by?.email ?? null,
      submitterName: run.created_by?.display_name ?? null,
    }));
}
