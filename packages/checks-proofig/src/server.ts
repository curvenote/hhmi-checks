import type { ServerExtension, ExtensionCheckService } from '@curvenote/scms-core';
import { extension as clientExtension } from './client.js';
import { handleProofigAction } from './server/actions.js';
import { ImageIntegrityChecksSection } from './components/ImageIntegrityChecksSection.js';
import { registerRoutes } from './routes.js';

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
      },
    ];
  },
  registerRoutes,
};
