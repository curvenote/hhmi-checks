import type {
  Context,
  ServerExtension,
  ExtensionCheckService,
  JobRegistration,
  ScopeTree,
} from '@curvenote/scms-core';
import { getPrismaClient } from '@curvenote/scms-server';
import { extension as clientExtension, TEXT_INTEGRITY_CHECKS_ACTION_PATH } from './client.js';
import { ext } from './scopes.js';
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
import { TextIntegrityUploadCheckOption } from './components/TextIntegrityUploadCheckOption.js';
import { isTextIntegrityUploadEligible } from './uploadEligibility.js';
import { registerRoutes } from './routes.js';
import { TextIntegritySectionHeader } from './components/TextIntegritySectionHeader.js';
import { getExtensionAdminActionHandlers } from './admin/actionHandlers.server.js';

export { TEXT_INTEGRITY_SUBMIT };
export { getTextIntegrityConfigWithOverrides } from './server/config.server.js';

function getSafeAdminConfig(config: Record<string, unknown>): Record<string, unknown> {
  return {
    serviceName: config.serviceName,
    relayInstanceId: config.relayInstanceId,
    storedServiceConfiguration: buildStoredServiceConfigurationForAdmin(config),
  };
}

function getScopes(): ScopeTree {
  return { ext };
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
  getScopes,
  getChecks: (): ExtensionCheckService[] => {
    return [
      {
        id: 'checks-text-integrity',
        name: 'Text Integrity',
        description: 'Verify text integrity in your work.',
        checksActionPath: TEXT_INTEGRITY_CHECKS_ACTION_PATH,
        sectionHeaderComponent: TextIntegritySectionHeader,
        sectionActivityComponent: TextIntegrityChecksSection,
        handleAction: handleTextIntegrityAction,
        handleStatus: textIntegrityStatus,
        uploadCheckOptionComponent: TextIntegrityUploadCheckOption,
        isUploadEligible: isTextIntegrityUploadEligible,
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
