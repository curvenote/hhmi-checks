import type {
  Context,
  ServerExtension,
  ExtensionCheckService,
  JobRegistration,
  ScopeTree,
} from '@curvenote/scms-core';
import { getPrismaClient } from '@curvenote/scms-server';
import { extension as clientExtension, PROOFIG_CHECKS_ACTION_PATH } from './client.js';
import { ext } from './scopes.js';
import { handleProofigAction, proofigStatus } from './server/actions.js';
import { getProofigConfigWithOverrides } from './server/config.server.js';
import {
  PROOFIG_SUBMIT_STREAM,
  proofigSubmitStreamHandler,
} from './server/jobs/proofig-submit-stream.server.js';
import { ImageIntegrityChecksSection } from './components/ImageIntegrityChecksSection.js';
import { ProofigUploadCheckOption } from './components/ProofigUploadCheckOption.js';
import { isProofigUploadEligible } from './uploadEligibility.js';
import { registerRoutes } from './routes.js';
import { ImageIntegritySectionHeader } from './components/ImageIntegritySectionHeader.js';
import { getExtensionAdminActionHandlers } from './admin/actionHandlers.server.js';

export { PROOFIG_SUBMIT_STREAM };
export { getProofigConfigWithOverrides } from './server/config.server.js';

function getSafeAdminConfig(config: Record<string, unknown>): Record<string, unknown> {
  return {
    apiBaseUrl: config.apiBaseUrl,
    notifyBaseUrl: config.notifyBaseUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret ? '****************' : undefined,
    // clientSecret is never exposed to the client
  };
}

function getScopes(): ScopeTree {
  return { ext };
}

async function getExtensionConfiguration(
  ctx: Context,
): Promise<Record<string, unknown> | undefined> {
  const base = ctx.$config?.app?.extensions?.['checks-proofig'] as
    | Record<string, unknown>
    | undefined;

  const prisma = await getPrismaClient();
  return getProofigConfigWithOverrides(base ?? {}, prisma);
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
        id: 'proofig',
        name: 'Image Integrity',
        description: 'Detect potential issues with images in your work.',
        checksActionPath: PROOFIG_CHECKS_ACTION_PATH,
        sectionHeaderComponent: ImageIntegritySectionHeader,
        sectionActivityComponent: ImageIntegrityChecksSection,
        handleAction: handleProofigAction,
        handleStatus: proofigStatus,
        uploadCheckOptionComponent: ProofigUploadCheckOption,
        isUploadEligible: isProofigUploadEligible,
      },
    ];
  },
  getJobs: (): JobRegistration[] => [
    {
      jobType: PROOFIG_SUBMIT_STREAM,
      handler: proofigSubmitStreamHandler as JobRegistration['handler'],
    },
  ],
  registerRoutes,
};
