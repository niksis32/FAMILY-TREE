import type {
  PortalLandingCopy,
  PortalModuleKey,
  PortalModuleToggles,
  PortalSiteSettingsResponse,
  PortalSiteStatsResponse,
  PortalWorkspaceBrandingSummary,
} from '@family/shared';

export const PORTAL_SETTINGS_ID = 'default';

export const DEFAULT_PORTAL_MODULES: PortalModuleToggles = {
  messenger: true,
  community: true,
  aiLab: true,
  cemeteries: true,
  militaryHistory: true,
  matching: true,
  wiki: true,
  archivesSearch: true,
  calendar: true,
  stories: true,
  quests: true,
};

export const PORTAL_MODULE_KEYS = Object.keys(DEFAULT_PORTAL_MODULES) as PortalModuleKey[];

export const DEFAULT_LANDING_COPY: PortalLandingCopy = {
  ru: {
    heroTitle: 'Family Memory',
    heroSubtitle: 'Семейный архив, древо предков и совместная работа над историей рода.',
    ctaLabel: 'Войти в архив',
  },
  en: {
    heroTitle: 'Family Memory',
    heroSubtitle: 'Family archive, genealogy tree, and collaborative family history.',
    ctaLabel: 'Enter archive',
  },
};

export const GLOBAL_FEATURE_FLAG_KEYS = [
  'gedcomAdvanced',
  'historicalMaps',
  'communityTools',
  'clientManagement',
  'multiWorkspace',
  'reportExport',
  'onPremDeploy',
  'whiteLabel',
  'webhooksEnabled',
  'WEBHOOKS_ENABLED',
] as const;

export type GlobalFeatureFlagKey = (typeof GLOBAL_FEATURE_FLAG_KEYS)[number];

export function parseModuleToggles(raw: unknown): PortalModuleToggles {
  const base = { ...DEFAULT_PORTAL_MODULES };
  if (!raw || typeof raw !== 'object') return base;
  for (const key of PORTAL_MODULE_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'boolean') base[key] = value;
  }
  return base;
}

export function parseLandingCopy(raw: unknown): PortalLandingCopy {
  const base: PortalLandingCopy = JSON.parse(JSON.stringify(DEFAULT_LANDING_COPY));
  if (!raw || typeof raw !== 'object') return base;
  for (const locale of ['ru', 'en'] as const) {
    const chunk = (raw as Record<string, unknown>)[locale];
    if (!chunk || typeof chunk !== 'object') continue;
    const c = chunk as Record<string, unknown>;
    if (typeof c.heroTitle === 'string') base[locale].heroTitle = c.heroTitle;
    if (typeof c.heroSubtitle === 'string') base[locale].heroSubtitle = c.heroSubtitle;
    if (typeof c.ctaLabel === 'string') base[locale].ctaLabel = c.ctaLabel;
  }
  return base;
}

export function mapPortalSettings(row: {
  portalName: string;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
  faviconUrl: string | null;
  landingCopy: unknown;
  modules: unknown;
  defaultLocale: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: Date;
}): PortalSiteSettingsResponse {
  return {
    portalName: row.portalName,
    tagline: row.tagline,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    faviconUrl: row.faviconUrl,
    landingCopy: parseLandingCopy(row.landingCopy),
    modules: parseModuleToggles(row.modules),
    defaultLocale: row.defaultLocale,
    maintenanceMode: row.maintenanceMode,
    maintenanceMessage: row.maintenanceMessage,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type PortalSiteStats = PortalSiteStatsResponse;
export type WorkspaceBrandingRow = PortalWorkspaceBrandingSummary;
