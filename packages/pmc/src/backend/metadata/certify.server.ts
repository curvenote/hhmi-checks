import { zfd } from 'zod-form-data';
import { withValidFormData } from '@curvenote/scms-server';
import { safelyPatchPMCMetadata } from './utils.server.js';

const CertifySchema = zfd.formData({
  certify: zfd
    .checkbox({ trueValue: 'true' })
    .or(zfd.text().transform((value) => (value === 'false' ? false : undefined))),
});

export async function updateCertifyManuscript(formData: FormData, workVersionId: string) {
  return withValidFormData(
    CertifySchema,
    formData,
    async ({ certify }) => {
      return safelyPatchPMCMetadata(workVersionId, {
        certifyManuscript: certify,
      });
    },
    { errorFields: { type: 'general', intent: 'certify-manuscript' } },
  );
}
