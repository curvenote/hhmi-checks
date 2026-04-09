import type { PrismaClient } from '@curvenote/scms-db';

/**
 * Object table type for Text Integrity config overrides.
 * Stored JSON uses top-level `credentials`, `features`, and `webhooks` (from relay POST …/status after configure).
 */
export const TEXT_INTEGRITY_CONFIG_OBJECT_TYPE = 'extension:text-integrity:config';

/** Admin-editable defaults (generation_settings + view_settings only). */
export interface TextIntegrityDefaults {
  similarity?: {
    generation_settings?: {
      search_repositories?: string[];
      submission_auto_excludes?: boolean;
    };
    view_settings?: Record<string, boolean>;
  };
}

/** Credentials block persisted on the Object row (UI overrides). */
export interface TextIntegrityCredentialsStored {
  apiBaseUrl?: string;
  apiKey?: string;
  keyName?: string;
}

/**
 * Shape stored in Object.data for type extension:text-integrity:config.
 * Legacy `featuresEnabled` / `serviceDetails` are read for migration only.
 */
export interface TextIntegrityStoredObject {
  credentials?: TextIntegrityCredentialsStored;
  notifyBaseUrl?: string;
  /** Service manifest from the relay plugin (name, title, logo, etc.). */
  manifest?: Record<string, unknown>;
  /** TCA features-enabled payload from relay service status (object). */
  features?: Record<string, unknown>;
  /** TCA webhooks list from relay service status. */
  webhooks?: unknown[];
  /** Latest EULA info from relay service status. */
  eula?: Record<string, unknown>;
  /** Legacy; omitted on new writes. */
  defaults?: TextIntegrityDefaults;
}

/**
 * Flat fields merged onto app.extensions['checks-text-integrity'] for runtime / admin loaders.
 */
export interface TextIntegrityConfigOverlay {
  apiBaseUrl?: string;
  apiKey?: string;
  keyName?: string;
  /** Checks relay plugin name (from app config), e.g. ithenticate */
  serviceName?: string;
  /**
   * Absolute base for Text Integrity webhook URLs (no trailing slash).
   * Default: `{request-origin}/v1/hooks/text-integrity/notify` when running the submit job.
   */
  notifyBaseUrl?: string;
  manifest?: Record<string, unknown>;
  features?: Record<string, unknown>;
  webhooks?: unknown[];
  eula?: Record<string, unknown>;
  defaults?: TextIntegrityDefaults;
}

export function cloneJsonObject(v: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
}

function cloneJsonValue<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isTextIntegrityDefaults(v: unknown): v is TextIntegrityDefaults {
  if (v == null || typeof v !== 'object') return false;
  return true;
}

/**
 * Normalizes raw Object.data into the stored shape and returns a copy safe to mutate/write.
 * Migrates legacy root-level apiBaseUrl / apiKey / keyName into `credentials`, and `featuresEnabled` → `features`.
 */
export function coerceTextIntegrityStoredObject(data: unknown): TextIntegrityStoredObject {
  const raw =
    data != null && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  let credentials: TextIntegrityCredentialsStored = {};
  const nested = raw.credentials;
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    const c = nested as Record<string, unknown>;
    if (typeof c.apiBaseUrl === 'string') credentials.apiBaseUrl = c.apiBaseUrl;
    if (typeof c.apiKey === 'string') credentials.apiKey = c.apiKey;
    if (typeof c.keyName === 'string') credentials.keyName = c.keyName;
  }
  if (typeof raw.apiBaseUrl === 'string' && credentials.apiBaseUrl === undefined) {
    credentials.apiBaseUrl = raw.apiBaseUrl;
  }
  if (typeof raw.apiKey === 'string' && credentials.apiKey === undefined) {
    credentials.apiKey = raw.apiKey;
  }
  if (typeof raw.keyName === 'string' && credentials.keyName === undefined) {
    credentials.keyName = raw.keyName;
  }

  if (Object.keys(credentials).length === 0) {
    credentials = {};
  }

  const out: TextIntegrityStoredObject = { credentials };

  if (raw.features != null && typeof raw.features === 'object' && !Array.isArray(raw.features)) {
    out.features = cloneJsonObject(raw.features as Record<string, unknown>);
  } else if (
    raw.featuresEnabled != null &&
    typeof raw.featuresEnabled === 'object' &&
    !Array.isArray(raw.featuresEnabled)
  ) {
    out.features = cloneJsonObject(raw.featuresEnabled as Record<string, unknown>);
  }

  if (Array.isArray(raw.webhooks)) {
    out.webhooks = cloneJsonValue(raw.webhooks);
  }

  if (raw.manifest != null && typeof raw.manifest === 'object' && !Array.isArray(raw.manifest)) {
    out.manifest = cloneJsonObject(raw.manifest as Record<string, unknown>);
  }

  if (raw.eula != null && typeof raw.eula === 'object' && !Array.isArray(raw.eula)) {
    out.eula = cloneJsonObject(raw.eula as Record<string, unknown>);
  }

  if (isTextIntegrityDefaults(raw.defaults)) {
    out.defaults = raw.defaults;
  }

  if (typeof raw.notifyBaseUrl === 'string') {
    out.notifyBaseUrl = raw.notifyBaseUrl;
  }

  return out;
}

function parseOverlay(data: unknown): Partial<TextIntegrityConfigOverlay> {
  const stored = coerceTextIntegrityStoredObject(data);
  const overlay: Partial<TextIntegrityConfigOverlay> = {};
  const c = stored.credentials ?? {};
  if (typeof c.apiBaseUrl === 'string') overlay.apiBaseUrl = c.apiBaseUrl;
  if (typeof c.apiKey === 'string') overlay.apiKey = c.apiKey;
  if (typeof c.keyName === 'string') overlay.keyName = c.keyName;
  if (typeof stored.notifyBaseUrl === 'string') overlay.notifyBaseUrl = stored.notifyBaseUrl;
  if (stored.manifest) overlay.manifest = stored.manifest;
  if (stored.features) overlay.features = stored.features;
  if (stored.webhooks) overlay.webhooks = stored.webhooks;
  if (stored.eula) overlay.eula = stored.eula;
  if (stored.defaults) overlay.defaults = stored.defaults;
  return overlay;
}

const ADMIN_SERVICE_CONFIGURATION_KEYS = [
  'manifest',
  'features',
  'webhooks',
  'eula',
  'defaults',
] as const;

/**
 * Whitelisted non-secret fields from merged extension config for the admin UI JSON panel.
 */
export function buildStoredServiceConfigurationForAdmin(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ADMIN_SERVICE_CONFIGURATION_KEYS) {
    const v = config[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') {
      try {
        out[key] = JSON.parse(JSON.stringify(v)) as Record<string, unknown> | unknown[];
      } catch {
        // skip non-JSON-serializable values
      }
    }
  }
  return out;
}

/**
 * Builds or syncs defaults from the TCA `features` object (relay service status).
 */
export function syncDefaultsFromFeatures(
  features: Record<string, unknown>,
  existingDefaults: TextIntegrityDefaults | undefined,
): TextIntegrityDefaults {
  const sim = features.similarity as
    | {
        generation_settings?: {
          search_repositories?: string[];
          submission_auto_excludes?: boolean;
        };
        view_settings?: Record<string, boolean>;
      }
    | undefined;
  const next: TextIntegrityDefaults = { similarity: {} };

  if (sim?.generation_settings) {
    const enabledRepos = sim.generation_settings.search_repositories ?? [];
    const existingRepos = existingDefaults?.similarity?.generation_settings?.search_repositories ?? [];
    const keptRepos = existingRepos.filter((r) => enabledRepos.includes(r));
    next.similarity!.generation_settings = {
      search_repositories: keptRepos.length > 0 ? keptRepos : [...enabledRepos],
      submission_auto_excludes:
        existingDefaults?.similarity?.generation_settings?.submission_auto_excludes ??
        sim.generation_settings.submission_auto_excludes ??
        false,
    };
  }

  if (sim?.view_settings && typeof sim.view_settings === 'object') {
    const enabledView = sim.view_settings;
    const existingView = existingDefaults?.similarity?.view_settings ?? {};
    next.similarity!.view_settings = {};
    for (const key of Object.keys(enabledView)) {
      next.similarity!.view_settings![key] =
        existingView[key] ?? (enabledView as Record<string, boolean>)[key] ?? false;
    }
  }

  return next;
}

/**
 * Returns base config with optional overrides from the Object table.
 * Loads the first Object row with type TEXT_INTEGRITY_CONFIG_OBJECT_TYPE (by date_modified desc)
 * and merges overlay fields onto the base config.
 */
export async function getTextIntegrityConfigWithOverrides(
  baseConfig: Record<string, unknown>,
  prisma: PrismaClient,
): Promise<Record<string, unknown>> {
  const row = await prisma.object.findFirst({
    where: { type: TEXT_INTEGRITY_CONFIG_OBJECT_TYPE },
    orderBy: { date_modified: 'desc' },
    select: { data: true },
  });
  if (!row?.data) return { ...baseConfig };
  const overlay = parseOverlay(row.data);
  return { ...baseConfig, ...overlay };
}
