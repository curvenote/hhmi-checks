import { useState } from 'react';
import type { ExtensionAdminCardProps } from '@curvenote/scms-core';
import { ServiceLogo } from '../components/ServiceLogo.js';
import { TextIntegrityCredentialsForm } from './TextIntegrityCredentialsForm.js';
import { TextIntegrityTestConnectionRow } from './TextIntegrityTestConnectionRow.js';
import { TextIntegrityUpdateConfigurationForm } from './TextIntegrityUpdateConfigurationForm.js';
import { TextIntegritySettingsPanel } from './TextIntegritySettingsPanel.js';

export function getManifest(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  const ssc = record?.storedServiceConfiguration;
  if (ssc == null || typeof ssc !== 'object' || Array.isArray(ssc)) return undefined;
  const manifest = (ssc as Record<string, unknown>).manifest;
  if (manifest == null || typeof manifest !== 'object' || Array.isArray(manifest)) return undefined;
  return manifest as Record<string, unknown>;
}

export default function ExtensionAdminCard({ record }: ExtensionAdminCardProps) {
  const displayConfig = record ?? {};
  const [credentials, setCredentials] = useState({
    apiBaseUrl: '',
    apiKey: '',
    keyName: '',
    relayInstanceId: '',
  });

  const manifest = getManifest(record);
  const manifestLogo = typeof manifest?.logo === 'string' ? manifest.logo : undefined;
  const title = typeof manifest?.title === 'string' ? manifest.title : 'Text Integrity';

  return (
    <div className="grid grid-cols-1 gap-6 max-w-3xl">
      <div className="flex gap-3 justify-between items-center min-w-0">
        <h2 className="text-xl font-semibold">Checks: {title}</h2>
        <ServiceLogo manifestLogoUrl={manifestLogo} manifestTitle={title} className="h-4 shrink-0" />
      </div>
      <TextIntegrityCredentialsForm
        displayConfig={displayConfig}
        onCredentialsChange={setCredentials}
      />
      <div
        id="text-integrity-service-actions"
        className="flex gap-3 items-center min-w-0 scroll-mt-4"
      >
        <TextIntegrityTestConnectionRow credentials={credentials} />
        <TextIntegrityUpdateConfigurationForm credentials={credentials} />
      </div>
      <TextIntegritySettingsPanel storedServiceConfiguration={displayConfig.storedServiceConfiguration} />
    </div>
  );
}
