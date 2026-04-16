import type { TextIntegrityServiceSettings } from './config.server.js';
import {
  SEARCH_REPOSITORY_IDS,
  VIEW_SETTING_KEYS,
  type ViewSettingKey,
} from '../settings-catalog.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function getFeaturesSimilarity(
  features: Record<string, unknown>,
): Record<string, unknown> | null {
  const sim = features.similarity;
  if (!isRecord(sim)) return null;
  return sim;
}

/** True when settings were never seeded or are an empty shell. */
export function isSettingsEmpty(settings: TextIntegrityServiceSettings | undefined): boolean {
  if (settings == null) return true;
  if (Object.keys(settings).length === 0) return true;
  const idx = settings.indexing_settings;
  const sim = settings.similarity;
  const hasIdx = isRecord(idx) && Object.keys(idx).length > 0;
  const hasSim = isRecord(sim) && Object.keys(sim).length > 0;
  return !hasIdx && !hasSim;
}

/**
 * Initial full settings snapshot after first configure.
 * Includes view keys only for flags present in provider `view_settings` (any boolean);
 * values default to off / 0. Search repos default to all tenant-allowed repos selected.
 */
export function buildDefaultSettings(features: Record<string, unknown>): TextIntegrityServiceSettings {
  const sim = getFeaturesSimilarity(features);
  const gen = sim && isRecord(sim.generation_settings) ? sim.generation_settings : null;
  const viewRaw =
    sim && isRecord(sim.view_settings) && !Array.isArray(sim.view_settings)
      ? (sim.view_settings as Record<string, unknown>)
      : null;

  const tenantRepos: string[] = [];
  if (gen && Array.isArray(gen.search_repositories)) {
    for (const id of gen.search_repositories) {
      if (typeof id === 'string') tenantRepos.push(id);
    }
  }

  const viewSettings: Record<string, boolean | number> = {};
  if (viewRaw) {
    for (const key of VIEW_SETTING_KEYS) {
      if (key in viewRaw) {
        viewSettings[key] = key === 'exclude_small_matches' ? 8 : false;
      }
    }
  }

  const submissionAuto =
    gen != null && 'submission_auto_excludes' in gen ? gen.submission_auto_excludes === true : false;

  const next: TextIntegrityServiceSettings = {
    indexing_settings: { add_to_index: false },
    similarity: {
      generation_settings: {
        search_repositories: [...tenantRepos],
        ...(submissionAuto ? { auto_exclude_self_matching_scope: 'NONE' as const } : {}),
      },
      view_settings: viewSettings,
    },
  };

  if (!submissionAuto && next.similarity?.generation_settings) {
    delete next.similarity.generation_settings.auto_exclude_self_matching_scope;
  }

  return next;
}

/**
 * After a subsequent configure: keep admin choices but drop paths the tenant no longer allows.
 */
export function reconcileSettingsWithFeatures(
  settings: TextIntegrityServiceSettings,
  features: Record<string, unknown>,
): TextIntegrityServiceSettings {
  const next = JSON.parse(JSON.stringify(settings)) as TextIntegrityServiceSettings;
  const sim = getFeaturesSimilarity(features);
  const gen = sim && isRecord(sim.generation_settings) ? sim.generation_settings : null;
  const viewFeat =
    sim && isRecord(sim.view_settings) && !Array.isArray(sim.view_settings)
      ? (sim.view_settings as Record<string, unknown>)
      : null;

  const allowedRepos = new Set<string>();
  if (gen && Array.isArray(gen.search_repositories)) {
    for (const id of gen.search_repositories) {
      if (typeof id === 'string') allowedRepos.add(id);
    }
  }

  if (next.similarity?.generation_settings?.search_repositories != null) {
    next.similarity.generation_settings.search_repositories =
      next.similarity.generation_settings.search_repositories.filter((r) => allowedRepos.has(r));
  }

  const submissionAuto =
    gen != null && 'submission_auto_excludes' in gen ? gen.submission_auto_excludes === true : false;
  if (!submissionAuto && next.similarity?.generation_settings) {
    delete next.similarity.generation_settings.auto_exclude_self_matching_scope;
  }

  const vs = next.similarity?.view_settings;
  if (vs != null && typeof vs === 'object') {
    if (!viewFeat) {
      if (next.similarity != null) {
        delete next.similarity.view_settings;
      }
    } else {
      for (const key of Object.keys(vs)) {
        if (viewFeat[key] !== true) {
          delete (vs as Record<string, unknown>)[key];
        }
      }
      if (Object.keys(vs).length === 0 && next.similarity) {
        delete next.similarity.view_settings;
      }
    }
  }

  if (
    next.similarity?.generation_settings &&
    Object.keys(next.similarity.generation_settings).length === 0
  ) {
    delete next.similarity.generation_settings;
  }
  if (next.similarity && Object.keys(next.similarity).length === 0) {
    delete next.similarity;
  }

  return next;
}

export function cloneServiceSettings(
  settings: TextIntegrityServiceSettings | undefined,
): TextIntegrityServiceSettings {
  if (settings == null) return {};
  return JSON.parse(JSON.stringify(settings)) as TextIntegrityServiceSettings;
}

export function tenantRepoEnabled(features: Record<string, unknown>, repoId: string): boolean {
  const sim = getFeaturesSimilarity(features);
  if (!sim) return false;
  const gen = sim.generation_settings;
  if (!isRecord(gen) || !Array.isArray(gen.search_repositories)) return false;
  return (gen.search_repositories as unknown[]).some((x) => x === repoId);
}

export function tenantViewSettingEnabled(
  features: Record<string, unknown>,
  key: ViewSettingKey,
): boolean {
  const sim = getFeaturesSimilarity(features);
  if (!sim || !isRecord(sim.view_settings)) return false;
  return (sim.view_settings as Record<string, unknown>)[key] === true;
}

export function tenantSelfMatchEnabled(features: Record<string, unknown>): boolean {
  const sim = getFeaturesSimilarity(features);
  if (!sim) return false;
  const gen = sim.generation_settings;
  if (!isRecord(gen) || !('submission_auto_excludes' in gen)) return false;
  return gen.submission_auto_excludes === true;
}

const SMALL_MATCH_MIN = 1;
const SMALL_MATCH_MAX = 999;

export type ApplySettingPatchResult = { ok: true } | { ok: false; message: string };

/**
 * Mutates `settings` in place (caller should pass a clone). Validates against `features`.
 */
export function applyTextIntegritySettingPatch(
  settings: TextIntegrityServiceSettings,
  features: Record<string, unknown>,
  name: string,
  value: string,
): ApplySettingPatchResult {
  if (name === 'add_to_index') {
    if (value !== 'true' && value !== 'false') {
      return { ok: false, message: 'Invalid value for add_to_index' };
    }
    settings.indexing_settings = settings.indexing_settings ?? {};
    settings.indexing_settings.add_to_index = value === 'true';
    return { ok: true };
  }

  const scopeMatch = /^search_repo_(.+)$/.exec(name);
  if (scopeMatch) {
    const repoId = scopeMatch[1];
    if (!(SEARCH_REPOSITORY_IDS as readonly string[]).includes(repoId)) {
      return { ok: false, message: 'Unknown search repository' };
    }
    if (!tenantRepoEnabled(features, repoId)) {
      return { ok: false, message: 'This search repository is not enabled for your tenant' };
    }
    if (value !== 'true' && value !== 'false') {
      return { ok: false, message: 'Invalid value' };
    }
    const on = value === 'true';
    settings.similarity = settings.similarity ?? {};
    settings.similarity.generation_settings = settings.similarity.generation_settings ?? {};
    const repos = new Set(settings.similarity.generation_settings.search_repositories ?? []);
    if (on) repos.add(repoId);
    else repos.delete(repoId);
    settings.similarity.generation_settings.search_repositories = Array.from(repos);
    return { ok: true };
  }

  if (name === 'auto_exclude_self_matching_scope') {
    if (value !== 'ALL' && value !== 'NONE') {
      return { ok: false, message: 'Invalid scope' };
    }
    if (!tenantSelfMatchEnabled(features)) {
      return { ok: false, message: 'Self-match exclusion is not enabled for your tenant' };
    }
    settings.similarity = settings.similarity ?? {};
    settings.similarity.generation_settings = settings.similarity.generation_settings ?? {};
    settings.similarity.generation_settings.auto_exclude_self_matching_scope = value;
    return { ok: true };
  }

  if ((VIEW_SETTING_KEYS as readonly string[]).includes(name)) {
    const key = name as ViewSettingKey;
    if (!tenantViewSettingEnabled(features, key)) {
      return { ok: false, message: 'This view option is not enabled for your tenant' };
    }
    if (key === 'exclude_small_matches') {
      const n = Math.floor(Number(value));
      if (value === '0' || n === 0) {
        settings.similarity = settings.similarity ?? {};
        settings.similarity.view_settings = settings.similarity.view_settings ?? {};
        settings.similarity.view_settings[key] = 0;
        return { ok: true };
      }
      if (Number.isNaN(n) || n < SMALL_MATCH_MIN || n > SMALL_MATCH_MAX) {
        return { ok: false, message: 'Invalid word threshold' };
      }
      settings.similarity = settings.similarity ?? {};
      settings.similarity.view_settings = settings.similarity.view_settings ?? {};
      settings.similarity.view_settings[key] = n;
      return { ok: true };
    }
    if (value !== 'true' && value !== 'false') {
      return { ok: false, message: 'Invalid value' };
    }
    settings.similarity = settings.similarity ?? {};
    settings.similarity.view_settings = settings.similarity.view_settings ?? {};
    settings.similarity.view_settings[key] = value === 'true';
    return { ok: true };
  }

  return { ok: false, message: 'Unknown setting name' };
}
