import type { LoaderFunctionArgs } from 'react-router';
import { Outlet } from 'react-router';
import type { MenuContents } from '@curvenote/scms-core';
import { SecondaryNav, MainWrapper, scopes } from '@curvenote/scms-core';
import { buildMenu } from '../backend/menu.server.js';
import { withAppPMCContext } from '../backend/context.server.js';
import type { SiteDTO } from '@curvenote/common';
import { extension } from '../client.js';

interface LoaderData {
  scopes: string[];
  site: SiteDTO;
  menu: MenuContents;
}

export async function loader(args: LoaderFunctionArgs): Promise<LoaderData> {
  const ctx = await withAppPMCContext(args, [scopes.site.read]);
  const menu = await buildMenu(ctx);
  return {
    scopes: ctx.scopes,
    site: ctx.siteDTO,
    menu,
  };
}

export default function ({ loaderData }: { loaderData: LoaderData }) {
  const { menu, site } = loaderData;

  return (
    <>
      <SecondaryNav
        branding={{
          logo: site.logo,
          logo_dark: site.logo_dark,
          url: site.links.html,
        }}
        title="PMC Administration"
        contents={menu as MenuContents}
        extensions={[extension]}
      />
      <MainWrapper hasSecondaryNav>
        <Outlet />
      </MainWrapper>
    </>
  );
}
