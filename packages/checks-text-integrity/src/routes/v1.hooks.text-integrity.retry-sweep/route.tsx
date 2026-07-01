import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { error405 } from '@curvenote/scms-core';
import {
  CronEndpointScopes,
  getConfig,
  verifyEndpointScopedHandshake,
} from '@curvenote/scms-server';
import { runTextIntegrityRetrySweep } from '../../server/retrySweep.server.js';

export const config = {
  maxDuration: 300,
};

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * POST /v1/hooks/text-integrity/retry-sweep
 *
 * Cron callback: retries eligible failed Text Integrity runs using the domain retry flow.
 * Auth: endpoint-scoped handshake (`CronEndpointScopes.TEXT_INTEGRITY_RETRY_SWEEP`).
 */
export async function loader(args: LoaderFunctionArgs) {
  if (args.request.method !== 'GET') {
    throw error405();
  }
  return unauthorized();
}

export async function action(args: ActionFunctionArgs) {
  if (args.request.method !== 'POST') {
    throw error405();
  }

  const appConfig = await getConfig();
  try {
    verifyEndpointScopedHandshake(
      args.request.headers.get('Authorization'),
      appConfig,
      CronEndpointScopes.TEXT_INTEGRITY_RETRY_SWEEP,
    );
  } catch {
    return unauthorized();
  }

  try {
    const result = await runTextIntegrityRetrySweep();
    return Response.json({ status: 'ok', ...result }, { status: 200 });
  } catch (error) {
    console.error('[text-integrity retry-sweep] failed', error);
    return Response.json({ status: 'error', message: 'Retry sweep failed' }, { status: 500 });
  }
}
