/**
 * Submit-proofig task service (Cloud Run, Pub/Sub triggered).
 * Receives work version payload, downloads PDF from metadata, posts multipart to Proofig API.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { HandlerContext } from '@curvenote/scms-tasks';
import { withPubSubHandler } from '@curvenote/scms-tasks';
import { validatePayload, getPdfFile, type ProofigSubmitPayload } from './payload.js';
import { buildProofigSubmitParams, postToProofig } from './proofig-client.js';

const PROOFIG_API_BASE_URL = process.env.PROOFIG_API_BASE_URL;

export function createService() {
  const app = express();
  app.use(express.json());

  app.get('/', async (_, res) => {
    return res.send('HHMI Submit-proofig Task Service');
  });

  app.post(
    '/',
    withPubSubHandler<ProofigSubmitPayload>(
      async (ctx: HandlerContext<ProofigSubmitPayload>) => {
        const { client, payload, res, tmpFolder } = ctx;

        if (!validatePayload(payload)) {
          throw new Error(
            'Invalid payload: expected taskId, workVersion (with metadata.files), submit_req_id, notify_url; at least one PDF file with signedUrl',
          );
        }

        if (!PROOFIG_API_BASE_URL?.trim()) {
          throw new Error('PROOFIG_API_BASE_URL environment variable is required');
        }

        const taskId = payload.taskId;
        await client.jobs.running(res, 'Downloading PDF...');

        const pdfFile = getPdfFile(payload);
        const signedUrl = pdfFile.signedUrl!;
        const filename = (
          pdfFile.name && !pdfFile.name.endsWith('.pdf')
            ? `${pdfFile.name}.pdf`
            : (pdfFile.name ?? pdfFile.path ?? 'manuscript.pdf')
        ) as string;

        const pdfResponse = await fetch(signedUrl);
        if (!pdfResponse.ok) {
          throw new Error(
            `Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`,
          );
        }
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);
        const tmpPath = path.join(tmpFolder, 'proofig-submit.pdf');
        await fs.writeFile(tmpPath, pdfBuffer);

        await client.jobs.running(res, 'Submitting to Proofig...');

        const params = buildProofigSubmitParams(payload, filename);
        const result = await postToProofig(PROOFIG_API_BASE_URL, params, pdfBuffer, filename);

        const reportId = result.report_id;
        await client.jobs.completed(res, 'Proofig submission accepted', {
          taskId,
          reportId,
        });
      },
      {
        clientLoggingOnlyMode: true,
        tmpFolderRoot: './tmp',
        preserveTmpFolder: true,
      },
    ),
  );

  return app;
}
