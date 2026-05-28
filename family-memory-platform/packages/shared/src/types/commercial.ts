/** PROMPT 12 — Commercial / SaaS contracts (no payment gateway in MVP). */

export type SubscriptionPlanCode =
  | 'FREE'
  | 'FAMILY'
  | 'RESEARCHER'
  | 'PROFESSIONAL'
  | 'ON_PREM';

export interface PlanEntitlements {
  maxFamilies: number;
  maxPersons: number;
  maxMediaBytes: number;
  aiCreditsPerMonth: number;
  maxGedcomExportsPerMonth: number;
  maxReportExportsPerMonth: number;
  features: {
    gedcomAdvanced: boolean;
    historicalMaps: boolean;
    communityTools: boolean;
    clientManagement: boolean;
    multiWorkspace: boolean;
    reportExport: boolean;
    onPremDeploy: boolean;
  };
}

export interface SubscriptionPlanSummary {
  id: string;
  code: SubscriptionPlanCode;
  name: string;
  description: string | null;
  entitlements: PlanEntitlements;
  sortOrder: number;
}

export interface WorkspaceUsageSnapshot {
  metric: string;
  used: string;
  limit: string;
  percentUsed: number;
}

export interface WorkspaceCommercialOverview {
  workspaceId: string;
  workspaceName: string;
  memberRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  plan: SubscriptionPlanSummary;
  subscriptionStatus: string;
  billingAccountStatus: string;
  billingEmail: string | null;
  usage: WorkspaceUsageSnapshot[];
  enabledFeatures: string[];
}

export interface WorkspaceMemberSummary {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
}

export interface WorkspaceInviteSummary {
  id: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  workspaceId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface PrivacyRequestSummary {
  id: string;
  type: 'EXPORT' | 'DELETE' | 'CONSENT_UPDATE';
  status: string;
  workspaceId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PrivacyCenterState {
  matchProfileOptIn: boolean;
  defaultPrivacyLevel: string;
  requests: PrivacyRequestSummary[];
}
