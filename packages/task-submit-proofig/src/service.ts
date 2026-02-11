/**
 * Submit-proofig task service (Cloud Run, Pub/Sub triggered).
 * Stub: posts "hello world" as running message, then completes.
 */

import express from 'express';
import type { HandlerContext } from '@curvenote/scms-tasks';
import { withPubSubHandler } from '@curvenote/scms-tasks';
import { validatePayload, type StubPayload } from './payload.js';

export function createService() {
  const app = express();
  app.use(express.json());

  app.get('/', async (_, res) => {
    return res.send('HHMI Submit-proofig Task Service');
  });

  app.post(
    '/',
    withPubSubHandler<StubPayload>(
      async (ctx: HandlerContext<StubPayload>) => {
        const { client, payload, res } = ctx;

        if (!validatePayload(payload)) {
          throw new Error('Invalid payload: expected a JSON object');
        }

        const taskId = payload.taskId;
        if (taskId) console.log('Task ID from payload', taskId);

        await client.jobs.running(res, 'hello world');
        await client.jobs.completed(res, 'Stub completed', { taskId });
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
