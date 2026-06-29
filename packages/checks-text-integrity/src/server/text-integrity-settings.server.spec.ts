// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';
import { deriveSettingsConfig } from '../admin/settings-config.js';
import { buildRelayContextEnvelope } from './relay-context.server.js';
import {
  applyTextIntegritySettingPatch,
  buildDefaultSettings,
  reconcileSettingsWithFeatures,
} from './text-integrity-settings.server.js';
import type { TextIntegrityServiceSettings } from './config.server.js';

const FEATURES = {
  similarity: {
    generation_settings: {
      search_repositories: ['INTERNET', 'SUBMITTED_WORK', 'PUBLICATION'],
    },
    view_settings: {},
  },
};

describe('text integrity search repository settings', () => {
  it('defaults Submitted Work to off even when the tenant feature includes it', () => {
    const settings = buildDefaultSettings(FEATURES);

    expect(settings.similarity?.generation_settings?.search_repositories).toEqual([
      'INTERNET',
      'PUBLICATION',
    ]);
  });

  it('does not expose Submitted Work as an admin setting descriptor', () => {
    const config = deriveSettingsConfig({
      features: FEATURES,
      settings: buildDefaultSettings(FEATURES),
    });

    expect(config?.searchRepositories.map((descriptor) => descriptor.name)).toEqual([
      'search_repo_INTERNET',
      'search_repo_PUBLICATION',
      'search_repo_CROSSREF',
      'search_repo_CROSSREF_POSTED_CONTENT',
    ]);
  });

  it('rejects attempts to enable Submitted Work through setting patches', () => {
    const result = applyTextIntegritySettingPatch(
      buildDefaultSettings(FEATURES),
      FEATURES,
      'search_repo_SUBMITTED_WORK',
      'true',
    );

    expect(result).toEqual({
      ok: false,
      message: 'This search repository is fixed off',
    });
  });

  it('drops Submitted Work from reconciled settings and relay context', () => {
    const settings: TextIntegrityServiceSettings = {
      similarity: {
        generation_settings: {
          search_repositories: ['INTERNET', 'SUBMITTED_WORK', 'PUBLICATION'],
        },
      },
    };

    const reconciled = reconcileSettingsWithFeatures(settings, FEATURES);
    expect(reconciled.similarity?.generation_settings?.search_repositories).toEqual([
      'INTERNET',
      'PUBLICATION',
    ]);

    const envelope = buildRelayContextEnvelope(settings);
    expect(envelope?.payload.report.searchRepositories).toEqual(['INTERNET', 'PUBLICATION']);
  });
});
