import type { ServerExtension, ExtensionCheckService, JobRegistration } from '@curvenote/scms-core';
import { extension as clientExtension } from './client.js';
import { handleProofigAction, proofigStatus } from './server/actions.js';
import {
  PROOFIG_SUBMIT,
  PROOFIG_SUBMIT_SERVICE,
  proofigSubmitHandler,
} from './server/jobs/proofig-submit-service.server.js';
import {
  PROOFIG_SUBMIT_STREAM,
  proofigSubmitStreamHandler,
} from './server/jobs/proofig-submit-stream.server.js';
import { ImageIntegrityChecksSection } from './components/ImageIntegrityChecksSection.js';
import { registerRoutes } from './routes.js';

export { PROOFIG_SUBMIT, PROOFIG_SUBMIT_SERVICE, PROOFIG_SUBMIT_STREAM };

export const extension: ServerExtension = {
  ...clientExtension,
  getChecks: (): ExtensionCheckService[] => {
    return [
      {
        id: 'proofig',
        name: 'Image Integrity',
        description: 'Detect potential issues with images in your work.',
        checksSectionComponent: ImageIntegrityChecksSection,
        handleAction: handleProofigAction,
        handleStatus: proofigStatus,
      },
    ];
  },
  getJobs: (): JobRegistration[] => [
    {
      jobType: PROOFIG_SUBMIT,
      handler: proofigSubmitHandler as JobRegistration['handler'],
    },
    {
      jobType: PROOFIG_SUBMIT_STREAM,
      handler: proofigSubmitStreamHandler as JobRegistration['handler'],
    },
  ],
  registerRoutes,
};
