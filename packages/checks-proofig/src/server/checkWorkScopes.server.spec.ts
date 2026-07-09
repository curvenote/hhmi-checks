// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scopes } from '@curvenote/scms-core';

const scmsServerMocks = vi.hoisted(() => ({
  getPrismaClient: vi.fn(),
  dbGetUserWorkRoles: vi.fn(),
  userHasWorkScope: vi.fn(),
}));

vi.mock('@curvenote/scms-server', () => scmsServerMocks);

import {
  guardProofigWorkCheckScopes,
  PROOFIG_DISPATCH_INTENTS,
  rejectWorkChecksDispatch,
  rejectWorkChecksRead,
} from './checkWorkScopes.server.js';

const ctx = {
  user: { id: 'user-1' },
  $config: { app: {} },
} as Parameters<typeof guardProofigWorkCheckScopes>[0];

describe('guardProofigWorkCheckScopes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    scmsServerMocks.getPrismaClient.mockResolvedValue({
      workVersion: {
        findUnique: vi.fn(async () => ({ work_id: 'work-1' })),
      },
    });
    scmsServerMocks.dbGetUserWorkRoles.mockResolvedValue([]);
    scmsServerMocks.userHasWorkScope.mockReturnValue(false);
  });

  it('rejects unauthenticated requests', async () => {
    const result = await guardProofigWorkCheckScopes(undefined, 'wv-1', 'execute');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.result.status).toBe(401);
    }
  });

  it('requires workVersionId', async () => {
    const result = await guardProofigWorkCheckScopes(ctx, undefined, 'execute');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.result.status).toBe(400);
    }
  });

  it('requires checks.read for hydrate-document-preparation-status', async () => {
    scmsServerMocks.userHasWorkScope.mockImplementation(
      (_user, scope) => scope === scopes.work.id.checks.read,
    );

    const result = await guardProofigWorkCheckScopes(
      ctx,
      'wv-1',
      'hydrate-document-preparation-status',
    );
    expect(result.ok).toBe(true);
  });

  it('requires checks.dispatch for outbound intents', async () => {
    scmsServerMocks.userHasWorkScope.mockImplementation(
      (_user, scope) => scope === scopes.work.id.checks.read,
    );

    for (const intent of PROOFIG_DISPATCH_INTENTS) {
      const result = await guardProofigWorkCheckScopes(ctx, 'wv-1', intent);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.result).toEqual(rejectWorkChecksDispatch());
      }
    }
  });

  it('allows dispatch intents when user has dispatch scope', async () => {
    scmsServerMocks.userHasWorkScope.mockReturnValue(true);

    const result = await guardProofigWorkCheckScopes(ctx, 'wv-1', 'execute');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workId).toBe('work-1');
    }
  });

  it('rejects when user lacks checks.read', async () => {
    const result = await guardProofigWorkCheckScopes(
      ctx,
      'wv-1',
      'hydrate-document-preparation-status',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.result).toEqual(rejectWorkChecksRead());
    }
  });
});
