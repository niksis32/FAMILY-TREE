/** PROMPT 13 — Privacy & Security Center contracts */

export type PublicShareResourceType = 'PERSON' | 'FAMILY_TREE' | 'MEDIA_BUNDLE' | 'FAMILY_STORY';

export interface UserConsentRecord {
  consentKey: 'GDPR_DATA_PROCESSING' | 'GLOBAL_MATCHING' | 'AI_LOCAL_PROCESSING';
  granted: boolean;
  version: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

export interface PublicShareSummary {
  id: string;
  resourceType: PublicShareResourceType;
  resourceId: string;
  label: string | null;
  hideLivingPersons: boolean;
  viewCount: number;
  tokenRevokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  publicUrl?: string;
}

export interface PublicShareCreateResult extends PublicShareSummary {
  publicToken: string;
}

export interface AccessLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  workspaceId: string | null;
  publicShareId: string | null;
  ipHash: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface PersonPrivacySettings {
  personId: string;
  privacyLevel: string;
  isLiving: boolean;
}

export interface TreePrivacySettings {
  familyId: string;
  hideLivingPersons: boolean;
  treePrivacyLevel: string;
}

export interface PrivacySecurityCenterState {
  consents: UserConsentRecord[];
  matchProfileOptIn: boolean;
  defaultPrivacyLevel: string;
  requests: import('./commercial').PrivacyRequestSummary[];
  publicShares: PublicShareSummary[];
  recentAccessLogs: AccessLogEntry[];
}
