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
  guardTextIntegrityWorkCheckScopes,
  TEXT_INTEGRITY_DISPATCH_INTENTS,
  rejectWorkChecksDispatch,
  rejectWorkChecksRead,
} from './checkWorkScopes.server.js';

const ctx = {
  user: { id: 'user-1' },
  $config: { app: {} },
} as Parameters<typeof guardTextIntegrityWorkCheckScopes>[0];

describe('guardTextIntegrityWorkCheckScopes', () => {
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

  it('allows eula-status with checks.read only', async () => {
    scmsServerMocks.userHasWorkScope.mockImplementation(
      (_user, scope) => scope === scopes.work.id.checks.read,
    );

    const result = await guardTextIntegrityWorkCheckScopes(ctx, 'wv-1', 'eula-status');
    expect(result.ok).toBe(true);
  });

  it('requires checks.dispatch for outbound intents', async () => {
    scmsServerMocks.userHasWorkScope.mockImplementation(
      (_user, scope) => scope === scopes.work.id.checks.read,
    );

    for (const intent of TEXT_INTEGRITY_DISPATCH_INTENTS) {
      const result = await guardTextIntegrityWorkCheckScopes(ctx, 'wv-1', intent);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.result).toEqual(rejectWorkChecksDispatch());
      }
    }
  });

  it('rejects when user lacks checks.read', async () => {
    const result = await guardTextIntegrityWorkCheckScopes(ctx, 'wv-1', 'eula-status');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.result).toEqual(rejectWorkChecksRead());
    }
  });
});
