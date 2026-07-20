import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { getConfig, verifyHandshakeToken } from '@curvenote/scms-server';
import { z } from 'zod';
import { patchProofigRunServiceData } from '../../server/checkRunColumns.server.js';
import {
  PROOFIG_REPORT_GENERATED_SLOT,
  buildProofigReportFileEntry,
} from '../../proofigReportFiles.js';

const PdfStoredBodySchema = z.object({
  work_version_id: z.string().min(1),
  report_id: z.string().optional(),
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  md5: z.string().min(1),
});

/** GET is not supported; the hook is POST-only. */
export function loader(_args: LoaderFunctionArgs) {
  throw error405();
}

/**
 * Registration hook called by the proofig-pdf-service Cloud Run worker after it uploads a
 * rendered report PDF. Authenticated with the handshake token minted for the render job
 * (same token used for the job callback). Records the file on the check run `serviceData.files`.
 */
export async function action(args: ActionFunctionArgs) {
  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  const authHeader = args.request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw httpError(401, 'Missing handshake token');
  }
  const config = await getConfig();
  verifyHandshakeToken(token, config.api.handshakeIssuer, config.api.handshakeSigningSecret);

  let json: unknown;
  try {
    json = await args.request.json();
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
  const parsed = PdfStoredBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const uploadDate = new Date().toISOString();
  const fileEntry = buildProofigReportFileEntry(body.path, body.size, body.md5, uploadDate);

  await patchProofigRunServiceData(id, (sd) => {
    const nextFiles = { ...(sd.files ?? {}) };
    for (const key of Object.keys(nextFiles)) {
      if (nextFiles[key]?.slot === PROOFIG_REPORT_GENERATED_SLOT) {
        delete nextFiles[key];
      }
    }
    nextFiles[body.path] = fileEntry;
    return {
      ...sd,
      files: nextFiles,
      proofigReportStored: true,
      storedReportId: body.report_id ?? sd.reportId,
    };
  });

  return Response.json({ ok: true }, { status: 200 });
}
