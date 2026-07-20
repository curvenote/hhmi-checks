import type { LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import {
  File,
  KnownBuckets,
  StorageBackend,
  getPrismaClient,
  withAppContext,
} from '@curvenote/scms-server';
import { proofigDataSchema } from '../../schema.js';
import {
  PROOFIG_REPORT_FILENAME,
  getStoredProofigReportFile,
  hasStoredProofigReport,
} from '../../proofigReportFiles.js';
import { assertWorkChecksReadForRun } from '../../server/checkWorkScopes.server.js';

type CheckServiceRunData = {
  serviceData?: unknown;
};

function pdfPendingResponse(reason: string) {
  return Response.json(
    {
      status: 'pending',
      reason,
      message: 'Proofig report PDF is not ready for download yet.',
    },
    { status: 409 },
  );
}

export async function action() {
  throw error405();
}

/**
 * Stream the persisted Proofig report PDF for a check run from work version storage.
 * Only serves when `hasStoredProofigReport` is true (current report id), matching the UI.
 */
export async function loader(args: LoaderFunctionArgs) {
  const ctx = await withAppContext(args);
  if (!ctx.user) {
    throw httpError(401, 'Authentication required');
  }

  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id } });
  if (!run) {
    throw httpError(404, 'Check run not found');
  }

  const readGate = await assertWorkChecksReadForRun(ctx, run.work_version_id);
  if (!readGate.ok) {
    throw httpError(readGate.result.status ?? 403, readGate.result.error?.message ?? 'Forbidden');
  }

  const runData = run.data as CheckServiceRunData | null;
  const parsed = proofigDataSchema.safeParse(runData?.serviceData);
  const serviceData = parsed.success ? parsed.data : undefined;
  if (!hasStoredProofigReport(serviceData)) {
    const hasFile = Boolean(getStoredProofigReportFile(serviceData)?.path);
    return pdfPendingResponse(hasFile ? 'stale-stored-report' : 'no-stored-file');
  }
  // Safe: hasStoredProofigReport requires a generated-slot entry with a path.
  const storedFile = getStoredProofigReportFile(serviceData)!;

  if (!run.work_version_id) {
    return pdfPendingResponse('no-work-version');
  }
  const workVersion = await prisma.workVersion.findUnique({
    where: { id: run.work_version_id },
    select: { cdn: true, cdn_key: true },
  });
  if (!workVersion?.cdn?.trim() || !workVersion.cdn_key?.trim()) {
    return pdfPendingResponse('storage-unavailable');
  }

  const backend = new StorageBackend(ctx, [KnownBuckets.prv, KnownBuckets.pub]);
  const bucket = backend.knownBucketFromCDN(workVersion.cdn);
  if (!bucket) {
    return pdfPendingResponse('unknown-bucket');
  }

  const file = new File(backend, storedFile.path, bucket);
  if (!(await file.exists())) {
    return pdfPendingResponse('stored-file-missing');
  }

  const stream = await file.readStream();
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${storedFile.name || PROOFIG_REPORT_FILENAME}"`,
    },
  });
}
