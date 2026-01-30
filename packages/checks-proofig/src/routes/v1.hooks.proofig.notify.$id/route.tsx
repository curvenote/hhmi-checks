import type { ActionFunctionArgs } from 'react-router';
import { error405, httpError } from '@curvenote/scms-core';
import { safeCheckServiceRunDataUpdate } from '@curvenote/scms-server';
import type { Prisma } from '@curvenote/scms-db';
import { ProofigNotifyPayloadSchema, proofigDataSchema } from '../../schema.js';
import { applyProofigNotifyToServiceData } from './utils.server.js';

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

  let json: unknown;
  try {
    json = await args.request.json();
  } catch (err) {
    throw httpError(400, 'Invalid JSON payload', {
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  const parsed = ProofigNotifyPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const receivedAt = new Date().toISOString();

  // store as an inbound message in the Messages table

  try {
    await safeCheckServiceRunDataUpdate(id, (data?: Prisma.JsonValue) => {
      const current = (data as Record<string, any>) ?? {};
      const currentServiceData = current.serviceData as unknown;

      const existingServiceDataResult = proofigDataSchema.safeParse(currentServiceData);
      const existingServiceData = existingServiceDataResult.success
        ? existingServiceDataResult.data
        : undefined;

      const nextServiceData = applyProofigNotifyToServiceData(
        existingServiceData,
        parsed.data,
        receivedAt,
      );

      return {
        ...current,
        status: current.status ?? 'healthy',
        serviceDataSchema: current.serviceDataSchema ?? {},
        serviceData: nextServiceData,
      } as Prisma.JsonObject;
    });
  } catch (err) {
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

  // Per spec, return a 200 with no required response body.
  return new Response(null, { status: 200 });
}
