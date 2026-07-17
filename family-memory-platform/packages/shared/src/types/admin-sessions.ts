export type LoginEventOutcome =
  | 'SUCCESS'
  | 'MFA_CHALLENGE'
  | 'FAILURE_BAD_CREDENTIALS'
  | 'FAILURE_INACTIVE'
  | 'FAILURE_MFA';

export interface AdminSessionStatsResponse {
  generatedAt: string;
  activeSessions: number;
  activeUsers: number;
  failedLogins24h: number;
  suspiciousEvents24h: number;
}

export interface AdminSessionSummary {
  id: string;
  jti: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  userRole: 'VIEWER' | 'EDITOR' | 'ADMIN';
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isActive: boolean;
  revokedAt: string | null;
  revokedByEmail: string | null;
  revokeReason: string | null;
}

export interface AdminSessionListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminSessionSummary[];
}

export interface AdminLoginEventSummary {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userDisplayName: string | null;
  emailAttempt: string | null;
  outcome: LoginEventOutcome;
  deviceLabel: string | null;
  ipAddress: string | null;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface AdminLoginEventListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminLoginEventSummary[];
}

export interface AdminRevokeSessionResponse {
  revoked: boolean;
  alreadyRevoked: boolean;
}

export interface AdminRevokeAllSessionsResponse {
  revokedCount: number;
}
