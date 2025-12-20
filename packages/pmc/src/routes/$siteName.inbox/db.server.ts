import type { SiteContext } from '@curvenote/scms-server';
import { sites } from '@curvenote/scms-server';

export async function dbListPMCSubmissionsWithLatestNonDraftVersion(ctx: SiteContext) {
  // Load all submissions data with deferred loading, except for incomplete versions
  const itemsPromise = sites.submissions.dbListSiteSubmissions(ctx.site.name, {
    versions: {
      some: {
        NOT: [{ status: 'INCOMPLETE' }],
      },
    },
  });

  const anotatedItemsPromise = itemsPromise
    .then(async (i) => {
      // if the items in i have all their versions in status DRAFT, then filter them out
      return i.filter((item) => {
        return !item.versions.every((v) => v.status === 'DRAFT');
      });
    })
    .then((i) =>
      i.map((item) => {
        // this depends on the order of the versions in the parent query,
        // which we expect to default to date_created descending
        const latestNonDraftVersion =
          item.versions.find((v) => v.status !== 'DRAFT') ?? item.versions[0];

        // if the latest version in status draft, then
        // add a boolean hasDraft to the item and set to true, otherwise set it to false
        const hasDraft = item.versions[0].status === 'DRAFT';

        return {
          ...item,
          status: latestNonDraftVersion.status,
          latestNonDraftVersion,
          hasDraft,
        };
      }),
    );
  return anotatedItemsPromise;
}
