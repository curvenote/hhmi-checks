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
import { PROOFIG_REPORT_FILENAME, getStoredProofigReportFile } from '../../proofigReportFiles.js';

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
 */
export async function loader(args: LoaderFunctionArgs) {
  const ctx = await withAppContext(args);

  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  const prisma = await getPrismaClient();
  const run = await prisma.checkServiceRun.findUnique({ where: { id } });
  if (!run) {
    throw httpError(404, 'Check run not found');
  }

  const runData = run.data as CheckServiceRunData | null;
  const parsed = proofigDataSchema.safeParse(runData?.serviceData);
  const serviceData = parsed.success ? parsed.data : undefined;
  const storedFile = getStoredProofigReportFile(serviceData);
  if (!storedFile?.path) {
    return pdfPendingResponse('no-stored-file');
  }

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
