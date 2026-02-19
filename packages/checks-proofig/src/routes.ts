import type { RouteConfigEntry } from '@react-router/dev/routes';
import type { RouteRegistration } from '@curvenote/scms-core';
import type { Config } from '@/types/app-config.js';
import { route } from '@react-router/dev/routes';
import { resolveRoutePath } from '@curvenote/scms-server';

/**
 * Registers routes for the Proofig checks extension.
 *
 * Webhook routes are mounted under `/v1/api/hooks/*` via `attachTo: 'v1/hooks'`.
 */
export async function registerRoutes(_appConfig: Config): Promise<RouteRegistration[]> {
  return [
    {
      attachTo: 'v1/hooks',
      register: () =>
        [
          route(
            'proofig/notify/:id',
            resolveRoutePath(import.meta.url, 'routes/v1.hooks.proofig.notify.$id/route.tsx'),
          ),
        ] satisfies RouteConfigEntry[],
    },
  ];
}
