import { describe, expect, it } from 'vitest';
import {
  computeCacheExpiresAtIso,
  jwtExpToUnixMs,
  parseJwtExp,
  proofigTokenObjectId,
} from './proofigAuth.server.js';

describe('parseJwtExp', () => {
  it('reads exp from JWT-shaped access_token (middle segment)', () => {
    const exp = 2_000_000_000;
    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        exp,
        iat: exp - 120,
        customer_id: 32,
        user_id: 75,
        user_role: 'EJPress',
      }),
    ).toString('base64url');
    expect(parseJwtExp(`${header}.${body}.signature-not-verified`)).toBe(exp);
  });
});

describe('proofigTokenObjectId', () => {
  it('prefixes type and uses 32-char hex (SHA-256 truncated) so the row id is human-scannable', () => {
    expect(proofigTokenObjectId('https://proofig.example.com/ej/', 'client-alpha')).toBe(
      'extension:proofig:token:bf287dfcc03b319508757097da444e9a',
    );
  });

  it('normalizes trailing slash on base URL so the same endpoint string hashes the same', () => {
    expect(proofigTokenObjectId('https://proofig.example.com/ej', 'client-alpha')).toBe(
      'extension:proofig:token:bf287dfcc03b319508757097da444e9a',
    );
  });

  it('changes hash when clientId changes (independent cache per credential identity)', () => {
    expect(proofigTokenObjectId('https://proofig.example.com/ej', 'client-beta')).toBe(
      'extension:proofig:token:8f25f0b5832942acc12a14decb713b95',
    );
  });
});

describe('jwtExpToUnixMs', () => {
  it('treats typical JWT exp as seconds', () => {
    expect(jwtExpToUnixMs(1_000_000_000)).toBe(1_000_000_000_000);
  });

  it('treats very large values as milliseconds', () => {
    expect(jwtExpToUnixMs(1_000_000_000_000)).toBe(1_000_000_000_000);
  });
});

describe('computeCacheExpiresAtIso', () => {
  it('sets soft expiry 10% before JWT exp (from now)', () => {
    const nowMs = 1_000_000_000_000;
    const expSec = 1_000_000_000 + 3_600; // 1h after epoch slice used as absolute exp
    const expMs = expSec * 1000;
    const remaining = expMs - nowMs;
    const expectedMs = expMs - 0.1 * remaining;
    expect(computeCacheExpiresAtIso(expSec, nowMs)).toBe(new Date(expectedMs).toISOString());
  });

  it('returns now when JWT is already expired', () => {
    const nowMs = 2_000_000_000_000;
    const expSec = 1_000_000_000;
    expect(computeCacheExpiresAtIso(expSec, nowMs)).toBe(new Date(nowMs).toISOString());
  });
});
