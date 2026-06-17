import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { withContext } from '@curvenote/scms-server';
import { verifyEulaCronBearer } from '../../server/eula-cron-auth.server.js';
import { getEulaCronSecret, runEulaCacheCronRefresh } from '../../server/eula.server.js';

async function handleEulaCacheRefresh(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const ctx = await withContext(args, { noTokens: true });

  const secret = getEulaCronSecret(ctx);
  if (!secret) {
    throw httpError(503, 'EULA cron refresh is not configured (set eulaCronSecret)');
  }

  if (!verifyEulaCronBearer(args.request.headers.get('Authorization'), secret)) {
    throw httpError(401, 'Unauthorized');
  }

  const result = await runEulaCacheCronRefresh(ctx);
  return Response.json({ ok: true, ...result }, { status: 200 });
}

/**
 * POST or GET /v1/hooks/text-integrity/eula-cache/refresh
 *
 * Cron-friendly endpoint to refresh cached Turnitin EULA (relay getTerms + page mode).
 * Auth: `Authorization: Bearer <eulaCronSecret>` from app config
 * (`app.extensions.checks-text-integrity.eulaCronSecret` or `app.checks.eulaCronSecret`).
 */
export async function loader(args: LoaderFunctionArgs) {
  if (args.request.method !== 'GET') {
    throw error405();
  }
  return handleEulaCacheRefresh(args);
}

export async function action(args: ActionFunctionArgs) {
  if (args.request.method !== 'POST') {
    throw error405();
  }
  return handleEulaCacheRefresh(args);
}
