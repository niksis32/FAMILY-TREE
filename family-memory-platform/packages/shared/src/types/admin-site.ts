export type PortalModuleKey =
  | 'messenger'
  | 'community'
  | 'aiLab'
  | 'cemeteries'
  | 'militaryHistory'
  | 'matching'
  | 'wiki'
  | 'archivesSearch'
  | 'calendar'
  | 'stories'
  | 'quests';

export type PortalModuleToggles = Record<PortalModuleKey, boolean>;

export interface PortalLandingLocaleCopy {
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
}

export type PortalLandingCopy = Record<string, PortalLandingLocaleCopy>;

/** Partial landing copy for PATCH (per-locale fields optional). */
export type PortalLandingCopyPatch = Partial<Record<string, Partial<PortalLandingLocaleCopy>>>;

export interface PortalSiteSettingsResponse {
  portalName: string;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
  faviconUrl: string | null;
  landingCopy: PortalLandingCopy;
  modules: PortalModuleToggles;
  defaultLocale: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

export interface PortalSiteStatsResponse {
  generatedAt: string;
  workspaceCount: number;
  brandedWorkspaces: number;
  globalFeatureFlags: number;
  maintenanceMode: boolean;
}

export interface PortalWorkspaceBrandingSummary {
  workspaceId: string;
  workspaceName: string;
  displayName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  hasLogo: boolean;
  updatedAt: string | null;
}

export interface PortalWorkspaceBrandingListResponse {
  total: number;
  limit: number;
  offset: number;
  items: PortalWorkspaceBrandingSummary[];
}

export interface PortalGlobalFeatureFlagSummary {
  key: string;
  enabled: boolean;
  id: string | null;
  updatedAt: string | null;
}

export interface PortalGlobalFeatureFlagsResponse {
  items: PortalGlobalFeatureFlagSummary[];
}

export interface PortalLocaleInfo {
  code: string;
  label: string;
  isDefault: boolean;
}

export interface PortalLocalesResponse {
  defaultLocale: string;
  locales: PortalLocaleInfo[];
}

export interface AdminUpdatePortalSettingsInput {
  portalName?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  faviconUrl?: string | null;
  landingCopy?: PortalLandingCopyPatch;
  modules?: Partial<PortalModuleToggles>;
  defaultLocale?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
}

export interface AdminUpdateWorkspaceBrandingInput {
  displayName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  faviconUrl?: string | null;
}

export interface AdminUpsertGlobalFeatureFlagInput {
  key: string;
  enabled: boolean;
}
