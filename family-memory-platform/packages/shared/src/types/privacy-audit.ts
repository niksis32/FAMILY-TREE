export type CrossTenantAuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type CrossTenantAuditFindingCode =
  | 'CROSS_WORKSPACE_PRIVATE_CANDIDATE'
  | 'CROSS_WORKSPACE_LIVING_UNREDACTED'
  | 'PRIVATE_PERSON_OPTED_IN_POOL'
  | 'PERSON_FAMILY_WORKSPACE_MISMATCH'
  | 'MATCH_CANDIDATE_SCORE_WITHOUT_CONSENT'
  | 'SEARCH_REINDEX_PRIVATE_PERSONS';

export interface CrossTenantAuditFinding {
  code: CrossTenantAuditFindingCode;
  severity: CrossTenantAuditSeverity;
  message: string;
  count: number;
  sampleIds?: string[];
  workspaceIds?: string[];
}

export interface CrossTenantPrivacyAuditReport {
  generatedAt: string;
  scope: 'platform' | 'workspace';
  workspaceId?: string;
  passed: boolean;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: CrossTenantAuditFinding[];
  recommendations: string[];
}
