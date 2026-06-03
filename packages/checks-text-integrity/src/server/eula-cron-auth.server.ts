import { timingSafeEqual } from 'node:crypto';

export function verifyEulaCronBearer(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret || !authorizationHeader?.startsWith('Bearer ')) {
    return false;
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token || token.length !== expectedSecret.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expectedSecret));
  } catch {
    return false;
  }
}
