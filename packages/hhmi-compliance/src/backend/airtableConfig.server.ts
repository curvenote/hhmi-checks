import { getConfig } from '@curvenote/scms-server';

// ==============================
// HHMI Compliance Airtable Configuration Types
// ==============================

interface HHMIComplianceAirtableConfig {
  apiKey: string;
}

// ==============================
// Configuration Access
// ==============================

/**
 * Get the complete HHMI Compliance Airtable configuration
 */
async function getHHMIComplianceAirtableConfig(): Promise<HHMIComplianceAirtableConfig> {
  const config = await getConfig();
  const airtableConfig = config.app.extensions?.['hhmi-compliance']?.airtable;

  if (!airtableConfig) {
    throw new Error(
      'HHMI Compliance Airtable configuration is missing. Please update the app-config.',
    );
  }

  if (!airtableConfig.apiKey) {
    throw new Error('HHMI Compliance Airtable API key is missing. Please update the app-config.');
  }

  return airtableConfig as HHMIComplianceAirtableConfig;
}

// ==============================
// Individual Getters (Maintains API Compatibility)
// ==============================

export async function getAirtableApiKey(): Promise<string | undefined> {
  const config = await getHHMIComplianceAirtableConfig();
  return config.apiKey;
}
