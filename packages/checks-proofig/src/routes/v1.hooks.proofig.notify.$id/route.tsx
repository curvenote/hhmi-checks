import type { ActionFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import {
  createMessageRecord,
  safeCheckServiceRunDataUpdate,
  updateMessageStatus,
} from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import {
  MINIMAL_PROOFIG_SERVICE_DATA,
  ProofigNotifyPayloadSchema,
  proofigDataSchema,
} from '../../schema.js';
import { updateStagesAndServiceDataFromValidatedNotifyPayload } from '../../server/stateMachine.server.js';
import {
  PROOFIG_NOTIFY_PAYLOAD_JSON_SCHEMA,
  PROOFIG_NOTIFY_RESULTS_JSON_SCHEMA,
} from './message-schema.server.js';

export function loader() {
  throw error405();
}

export async function action(args: ActionFunctionArgs) {
  const id = args.params.id;
  if (!id) {
    throw httpError(400, 'Missing check service run id');
  }

  // TODO(auth): Proofig notifies should include the access token in headers.
  // We haven't implemented the full auth/verification cycle yet.

  const receivedAt = new Date().toISOString();

  // Read the request body once; we always create a pending message record for every webhook.
  let rawBody = '';
  try {
    rawBody = await args.request.text();
  } catch (err) {
    throw httpError(400, 'Unable to read request body', {
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  let json: unknown;
  try {
    json = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    json = null;
  }

  const messageId = await createMessageRecord({
    module: '@hhmi/checks-proofig',
    type: 'proofingNotify',
    status: 'PENDING',
    payload: (json ?? { rawBody }) as any,
    payloadSchema: PROOFIG_NOTIFY_PAYLOAD_JSON_SCHEMA,
    results: { checkServiceRunId: id, receivedAt } as any,
    resultsSchema: PROOFIG_NOTIFY_RESULTS_JSON_SCHEMA,
  });

  const parsed = ProofigNotifyPayloadSchema.safeParse(json);
  if (!parsed.success) {
    await updateMessageStatus(messageId, 'ERROR', {
      processedAt: new Date().toISOString(),
      issues: parsed.error.issues,
    } as any);
    return Response.json(
      { ok: false, error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await safeCheckServiceRunDataUpdate(id, (data?: Prisma.JsonValue) => {
      const current = (data as Record<string, any>) ?? {};
      const currentServiceData = current.serviceData as unknown;

      const existingServiceDataResult = proofigDataSchema.safeParse(currentServiceData);
      const existingServiceData = existingServiceDataResult.success
        ? existingServiceDataResult.data
        : undefined;

      const nextServiceData = updateStagesAndServiceDataFromValidatedNotifyPayload(
        existingServiceData ?? MINIMAL_PROOFIG_SERVICE_DATA,
        parsed.data,
        receivedAt,
      );

      if (nextServiceData == null) return null;

      return {
        ...current,
        status: current.status ?? 'healthy',
        serviceDataSchema: current.serviceDataSchema ?? {},
        serviceData: nextServiceData,
      } as Prisma.JsonObject;
    });
  } catch (err) {
    await updateMessageStatus(messageId, 'ERROR', {
      processedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    } as any);
    // Keep behavior simple per requirement: 200 if expected, otherwise 400.
    return Response.json(
      {
        ok: false,
        error: 'Failed to persist webhook payload',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 400 },
    );
  }

  await updateMessageStatus(messageId, 'ACCEPTED', {
    processedAt: new Date().toISOString(),
  } as any);

  // Per spec, return a 200 with no required response body.
  return new Response(null, { status: 200 });
}
