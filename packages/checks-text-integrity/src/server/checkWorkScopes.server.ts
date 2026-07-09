import {
  dbGetUserWorkRoles,
  getPrismaClient,
  userHasWorkScope,
  type UserWithWorkRolesDBO,
} from '@curvenote/scms-server';
import { scopes, type Context, type ExtensionCheckHandleActionResult } from '@curvenote/scms-core';

/** Intents that call the relay / provider and require work:checks:dispatch. */
export const TEXT_INTEGRITY_DISPATCH_INTENTS = new Set([
  'accept-eula',
  'execute',
  'retry',
  'refresh-viewer-url',
  'relay-status',
  'restart-similarity-pdf',
]);

export function rejectWorkChecksRead(): ExtensionCheckHandleActionResult {
  return {
    error: {
      type: 'general',
      message: 'You do not have permission to view checks for this work',
    },
    status: 403,
  };
}

export function rejectWorkChecksDispatch(): ExtensionCheckHandleActionResult {
  return {
    error: {
      type: 'general',
      message: 'You do not have permission to dispatch checks for this work',
    },
    status: 403,
  };
}

export async function resolveWorkIdForWorkVersion(workVersionId: string): Promise<string | null> {
  const prisma = await getPrismaClient();
  const row = await prisma.workVersion.findUnique({
    where: { id: workVersionId },
    select: { work_id: true },
  });
  return row?.work_id ?? null;
}

export async function loadUserWithWorkRoles(
  ctx: Context,
  workId: string,
): Promise<UserWithWorkRolesDBO | undefined> {
  if (!ctx.user?.id) return undefined;
  const workRoles = await dbGetUserWorkRoles(ctx.user.id, workId);
  return { ...ctx.user, work_roles: workRoles };
}

export async function assertWorkChecksRead(
  ctx: Context,
  workVersionId: string,
): Promise<
  | { ok: true; workId: string; user: UserWithWorkRolesDBO }
  | { ok: false; result: ExtensionCheckHandleActionResult }
> {
  const workId = await resolveWorkIdForWorkVersion(workVersionId);
  if (!workId) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'Work version not found' },
        status: 404,
      },
    };
  }
  const user = await loadUserWithWorkRoles(ctx, workId);
  if (!user || !userHasWorkScope(user, scopes.work.id.checks.read, workId)) {
    return { ok: false, result: rejectWorkChecksRead() };
  }
  return { ok: true, workId, user };
}

export async function assertWorkChecksDispatch(
  user: UserWithWorkRolesDBO,
  workId: string,
): Promise<{ ok: true } | { ok: false; result: ExtensionCheckHandleActionResult }> {
  if (!userHasWorkScope(user, scopes.work.id.checks.dispatch, workId)) {
    return { ok: false, result: rejectWorkChecksDispatch() };
  }
  return { ok: true };
}

export async function guardTextIntegrityWorkCheckScopes(
  ctx: Context | undefined,
  workVersionId: string | undefined,
  intent: string,
): Promise<
  | { ok: true; ctx: Context; workId: string }
  | { ok: false; result: ExtensionCheckHandleActionResult }
> {
  if (!ctx) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'Authentication required' },
        status: 401,
      },
    };
  }
  if (!workVersionId?.trim()) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'workVersionId is required' },
        status: 400,
      },
    };
  }

  const readGate = await assertWorkChecksRead(ctx, workVersionId);
  if (!readGate.ok) return readGate;

  if (TEXT_INTEGRITY_DISPATCH_INTENTS.has(intent)) {
    const dispatchGate = await assertWorkChecksDispatch(readGate.user, readGate.workId);
    if (!dispatchGate.ok) return dispatchGate;
  }

  return {
    ok: true,
    ctx: { ...ctx, user: readGate.user },
    workId: readGate.workId,
  };
}

export async function assertWorkChecksReadForRun(
  ctx: Context,
  workVersionId: string | null | undefined,
): Promise<
  | { ok: true; workId: string; user: UserWithWorkRolesDBO }
  | { ok: false; result: ExtensionCheckHandleActionResult }
> {
  if (!workVersionId?.trim()) {
    return {
      ok: false,
      result: {
        error: { type: 'general', message: 'Work version not found for this check run' },
        status: 404,
      },
    };
  }
  return assertWorkChecksRead(ctx, workVersionId);
}
