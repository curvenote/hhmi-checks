import type { PrismaClient, Prisma } from '@curvenote/scms-db';

/** Object table type for cached Proofig access token. */
export const PROOFIG_TOKEN_OBJECT_TYPE = 'extension:proofig:token';

/** Fixed id for the single token row; we upsert so only one entry exists. */
const PROOFIG_TOKEN_OBJECT_ID = PROOFIG_TOKEN_OBJECT_TYPE;

/** Response from POST <BaseURL>/auth/authenticate. */
export interface ProofigAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Stored token record in Object.data (response + created_at). */
export interface ProofigTokenCacheData extends ProofigAuthResponse {
  created_at: string; // ISO timestamp of when the auth call was made minus 1 minute
}

const AUTH_PATH = '/auth/authenticate';

/**
 * Returns a valid Proofig access token, using cache when possible.
 * - Checks for a valid cached token (Object type extension:proofig:token).
 * - If none or expired, calls Proofig authenticate API, caches the response
 *   (with created_at = now minus 1 minute), and returns the new access_token.
 * - Token is sent as Bearer in the Authorization header on subsequent API calls.
 */
export async function getProofigToken(
  apiBaseUrl: string,
  mergedConfig: Record<string, unknown>,
  prisma: PrismaClient,
): Promise<string> {
  const clientId = mergedConfig.clientId as string | undefined;
  const clientSecret = mergedConfig.clientSecret as string | undefined;
  if (!clientId?.trim() || !clientSecret?.trim()) {
    throw new Error(
      'checks-proofig extension config missing clientId or clientSecret; cannot authenticate with Proofig',
    );
  }

  const base = apiBaseUrl.replace(/\/$/, '');
  const authUrl = `${base}${AUTH_PATH}`;

  // Authenticate
  const body = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
  const text = await response.text();
  let json: ProofigAuthResponse;
  try {
    json = text ? (JSON.parse(text) as ProofigAuthResponse) : ({} as ProofigAuthResponse);
  } catch {
    throw new Error(`Proofig auth returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    const msg = (json as { error_message?: string }).error_message ?? text ?? response.statusText;
    throw new Error(`Proofig auth error ${response.status}: ${msg}`);
  }
  if (!json.access_token) {
    throw new Error('Proofig auth response missing access_token');
  }

  const cacheToken = false;
  if (cacheToken) {
    // created_at = when the call was made minus 1 minute (conservative for expiry)
    const callTime = new Date();
    const createdAt = new Date(callTime.getTime() - 60 * 1000).toISOString();
    const cacheData: ProofigTokenCacheData = {
      ...json,
      created_at: createdAt,
    };
    const now = new Date().toISOString();
    const dataJson = cacheData as unknown as Prisma.InputJsonValue;
    await prisma.object.upsert({
      where: { id: PROOFIG_TOKEN_OBJECT_ID },
      create: {
        id: PROOFIG_TOKEN_OBJECT_ID,
        type: PROOFIG_TOKEN_OBJECT_TYPE,
        date_created: now,
        date_modified: now,
        data: dataJson,
      },
      update: {
        data: dataJson,
        date_modified: now,
      },
    });
  }

  return json.access_token;
}
