import { useFetcher, useLoaderData } from 'react-router';
import { ui } from '@curvenote/scms-core';
import type { GeneralError } from '@curvenote/scms-core';
import type { PMCWorkVersionMetadataSection } from '../common/metadata.schema.js';

export function CertifyManuscript() {
  const { metadata } = useLoaderData<{ metadata: PMCWorkVersionMetadataSection }>();
  let { pmc } = metadata;
  const fetcher = useFetcher<{ success: boolean; error: GeneralError }>();

  if (fetcher.formData?.get('certify')) {
    pmc = { certifyManuscript: fetcher.formData.get('certify') === 'true' };
  }

  return (
    <div id="certify-manuscript">
      <fetcher.Form method="post" className="flex flex-col gap-4">
        <div className="flex gap-2 items-top">
          <ui.Checkbox
            id="certify"
            defaultChecked={pmc?.certifyManuscript}
            name="certify"
            onCheckedChange={(checked) => {
              const formData = new FormData();
              formData.append('intent', 'certify-manuscript');
              formData.append('certify', checked.toString());
              fetcher.submit(formData, { method: 'post' });
            }}
          />
          <label htmlFor="certify" className="text-base">
            <span className="cursor-pointer hover:text-black">
              I certify that this manuscript submission includes all referenced figures, tables,
              videos, and supplementary material.
            </span>
          </label>
        </div>
        {fetcher.data?.error && <ui.SmallErrorTray error={fetcher.data.error?.message} />}
      </fetcher.Form>
    </div>
  );
}
