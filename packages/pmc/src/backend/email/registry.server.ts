import { pmcEmailProcessorRegistry } from './types.server.js';
import { bulkSubmissionHandler, bulkSubmissionConfig } from './handlers/bulk-submission.server.js';
import { catchAllHandler, catchAllConfig } from './handlers/catch-all.server.js';
import {
  nihmsFilesRequestHandler,
  nihmsFilesRequestConfig,
} from './handlers/nihms-files-request.server.js';

/**
 * Initialize the PMC email processor registry with all available handlers
 */
export function initializeEmailProcessorRegistry(): void {
  // Register bulk submission handler
  pmcEmailProcessorRegistry.register(bulkSubmissionHandler);

  // Register NIHMS files request handler
  pmcEmailProcessorRegistry.register(nihmsFilesRequestHandler);

  // Register catch-all handler as fallback
  pmcEmailProcessorRegistry.register(catchAllHandler);

  // Future email types can be registered here
  // pmcEmailProcessorRegistry.register(reviewerNotificationHandler);
  // pmcEmailProcessorRegistry.register(adminNotificationHandler);
}

/**
 * Get the default configuration for all email processors
 */
export function getDefaultEmailProcessorConfigs(): Record<string, any> {
  return {
    'bulk-submission-initial-email': bulkSubmissionConfig,
    'nihms-files-request': nihmsFilesRequestConfig,
    'catch-all': catchAllConfig,
    // Future email processor configs can be added here
  };
}

/**
 * Get configuration for a specific email processor
 */
export function getEmailProcessorConfig(type: string, appConfig: any): any {
  const defaultConfigs = getDefaultEmailProcessorConfigs();
  const defaultConfig = defaultConfigs[type];

  if (!defaultConfig) {
    throw new Error(`No configuration found for email type: ${type}`);
  }

  // Merge with app config if available
  const appEmailConfig = appConfig?.app?.extensions?.pmc?.inboundEmail;
  if (appEmailConfig) {
    return {
      ...defaultConfig,
      allowedSenders: appEmailConfig.senders || defaultConfig.allowedSenders,
      enabled: appEmailConfig.enabled !== false && defaultConfig.enabled,
    };
  }

  return defaultConfig;
}
