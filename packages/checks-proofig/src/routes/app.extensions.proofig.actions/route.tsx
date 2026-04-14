import { data } from 'react-router';
import { withAppScopedContext } from '@curvenote/scms-server';
import { scopes } from '@curvenote/scms-core';
import { handleProofigAction } from '../../server/actions.js';
import { extension as proofigServerExtension } from '../../server.js';

export async function loader() {
  return data(
    { error: { type: 'general', message: 'Method Not Allowed' } },
    {
      status: 405,
      headers: { Allow: 'POST' },
    },
  );
}

export async function action(args: Parameters<typeof withAppScopedContext>[0]) {
  const ctx = await withAppScopedContext(args, [scopes.app.works.upload]);
  const formData = await args.request.formData();
  const intent = formData.get('intent')?.toString().trim();
  const workVersionId = formData.get('workVersionId')?.toString().trim();

  if (!intent) {
    return data({ error: { type: 'general', message: 'intent is required' } }, { status: 400 });
  }
  if (!workVersionId) {
    return data(
      { error: { type: 'general', message: 'workVersionId is required' } },
      { status: 400 },
    );
  }

  return handleProofigAction({
    intent,
    workVersionId,
    formData,
    ctx,
    serverExtensions: [proofigServerExtension],
  });
}
