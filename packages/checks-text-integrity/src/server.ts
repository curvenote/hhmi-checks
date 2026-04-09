import type {
  Context,
  ServerExtension,
  ExtensionCheckService,
  JobRegistration,
} from '@curvenote/scms-core';
import { getPrismaClient } from '@curvenote/scms-server';
import { extension as clientExtension } from './client.js';
import { handleTextIntegrityAction, textIntegrityStatus } from './server/actions.js';
import {
  buildStoredServiceConfigurationForAdmin,
  getTextIntegrityConfigWithOverrides,
} from './server/config.server.js';
import {
  TEXT_INTEGRITY_SUBMIT,
  textIntegritySubmitHandler,
} from './server/jobs/text-integrity-submit.server.js';
import { TextIntegrityChecksSection } from './components/TextIntegrityChecksSection.js';
import { registerRoutes } from './routes.js';
import { TextIntegritySectionHeader } from './components/TextIntegritySectionHeader.js';
import { getExtensionAdminActionHandlers } from './admin/actionHandlers.server.js';

export { TEXT_INTEGRITY_SUBMIT };
export { getTextIntegrityConfigWithOverrides } from './server/config.server.js';

function getSafeAdminConfig(config: Record<string, unknown>): Record<string, unknown> {
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiKey: config.apiKey ? '****************' : undefined,
    keyName: config.keyName,
    storedServiceConfiguration: buildStoredServiceConfigurationForAdmin(config),
  };
}

async function getExtensionConfiguration(
  ctx: Context,
): Promise<Record<string, unknown> | undefined> {
  const base = ctx.$config?.app?.extensions?.['checks-text-integrity'] as
    | Record<string, unknown>
    | undefined;

  const prisma = await getPrismaClient();
  return getTextIntegrityConfigWithOverrides(base ?? {}, prisma);
}

export const extension: ServerExtension = {
  ...clientExtension,
  getExtensionConfiguration,
  getSafeAdminConfig,
  getExtensionAdminActionHandlers,
  getChecks: (): ExtensionCheckService[] => {
    return [
      {
        id: 'checks-text-integrity',
        name: 'Text Integrity',
        description: 'Verify text integrity in your work.',
        sectionHeaderComponent: TextIntegritySectionHeader,
        sectionActivityComponent: TextIntegrityChecksSection,
        handleAction: handleTextIntegrityAction,
        handleStatus: textIntegrityStatus,
      },
    ];
  },
  getJobs: (): JobRegistration[] => [
    {
      jobType: TEXT_INTEGRITY_SUBMIT,
      handler: textIntegritySubmitHandler as JobRegistration['handler'],
    },
  ],
  registerRoutes,
};
