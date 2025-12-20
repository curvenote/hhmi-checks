import type { SiteContextWithUser } from '@curvenote/scms-server';
import { registerExtensionNavigation } from '@curvenote/scms-core';

export async function buildMenu(ctx: SiteContextWithUser) {
  const mountPoint = `app/sites/${ctx.site.name}`;
  const baseUrl = `/${mountPoint}`;

  const fromExtensions = await registerExtensionNavigation(ctx.$config, mountPoint, baseUrl);
  const menu = fromExtensions.menu;

  return menu;
}
