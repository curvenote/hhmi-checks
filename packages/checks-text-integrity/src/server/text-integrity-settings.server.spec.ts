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

const SMALL_MATCH_FEATURES = {
  similarity: {
    generation_settings: {
      search_repositories: ['INTERNET'],
    },
    view_settings: {
      exclude_quotes: true,
      exclude_small_matches: true,
    },
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

describe('text integrity exclude small matches setting', () => {
  it('omits exclude_small_matches from default settings while keeping boolean view defaults', () => {
    const settings = buildDefaultSettings(SMALL_MATCH_FEATURES);

    expect(settings.similarity?.view_settings).toEqual({
      exclude_quotes: false,
    });
  });

  it('derives an off descriptor with a default threshold of 8 when the setting is omitted', () => {
    const config = deriveSettingsConfig({
      features: SMALL_MATCH_FEATURES,
      settings: buildDefaultSettings(SMALL_MATCH_FEATURES),
    });

    const descriptor = config?.viewSettings.find((d) => d.name === 'exclude_small_matches');

    expect(descriptor).toMatchObject({
      kind: 'smallMatches',
      defaultValue: false,
      wordThreshold: 8,
      disabled: false,
    });
  });

  it('derives an enabled descriptor when a saved threshold is at least 8', () => {
    const config = deriveSettingsConfig({
      features: SMALL_MATCH_FEATURES,
      settings: {
        similarity: {
          view_settings: {
            exclude_small_matches: 12,
          },
        },
      },
    });

    const descriptor = config?.viewSettings.find((d) => d.name === 'exclude_small_matches');

    expect(descriptor).toMatchObject({
      kind: 'smallMatches',
      defaultValue: true,
      wordThreshold: 12,
    });
  });

  it('treats a legacy zero threshold as off with a draft threshold of 8', () => {
    const config = deriveSettingsConfig({
      features: SMALL_MATCH_FEATURES,
      settings: {
        similarity: {
          view_settings: {
            exclude_small_matches: 0,
          },
        },
      },
    });

    const descriptor = config?.viewSettings.find((d) => d.name === 'exclude_small_matches');

    expect(descriptor).toMatchObject({
      kind: 'smallMatches',
      defaultValue: false,
      wordThreshold: 8,
    });
  });

  it('stores the default threshold when enabling with a boolean value', () => {
    const result = applyTextIntegritySettingPatch(
      buildDefaultSettings(SMALL_MATCH_FEATURES),
      SMALL_MATCH_FEATURES,
      'exclude_small_matches',
      'true',
    );

    expect(result).toEqual({
      ok: true,
      settings: expect.objectContaining({
        similarity: expect.objectContaining({
          view_settings: expect.objectContaining({
            exclude_small_matches: 8,
          }),
        }),
      }),
    });
  });

  it('stores numeric thresholds at or above 8 and rejects smaller values', () => {
    const enabled = applyTextIntegritySettingPatch(
      buildDefaultSettings(SMALL_MATCH_FEATURES),
      SMALL_MATCH_FEATURES,
      'exclude_small_matches',
      '12',
    );
    const rejected = applyTextIntegritySettingPatch(
      buildDefaultSettings(SMALL_MATCH_FEATURES),
      SMALL_MATCH_FEATURES,
      'exclude_small_matches',
      '7',
    );

    expect(enabled).toEqual({
      ok: true,
      settings: expect.objectContaining({
        similarity: expect.objectContaining({
          view_settings: expect.objectContaining({
            exclude_small_matches: 12,
          }),
        }),
      }),
    });
    expect(rejected).toEqual({ ok: false, message: 'Invalid word threshold' });
  });

  it('deletes exclude_small_matches when the toggle is disabled', () => {
    const result = applyTextIntegritySettingPatch(
      {
        similarity: {
          view_settings: {
            exclude_quotes: true,
            exclude_small_matches: 12,
          },
        },
      },
      SMALL_MATCH_FEATURES,
      'exclude_small_matches',
      'false',
    );

    expect(result).toEqual({
      ok: true,
      settings: {
        similarity: {
          view_settings: {
            exclude_quotes: true,
          },
        },
      },
    });
  });

  it('omits disabled or legacy small-match values from relay context and includes valid thresholds', () => {
    const disabled = buildRelayContextEnvelope({
      similarity: {
        view_settings: {
          exclude_small_matches: 0,
        },
      },
    });
    const enabled = buildRelayContextEnvelope({
      similarity: {
        view_settings: {
          exclude_small_matches: 12,
        },
      },
    });

    expect(disabled).toBeUndefined();
    expect(enabled?.payload.report.view).toEqual({
      excludeSmallMatches: 12,
    });
  });
});
