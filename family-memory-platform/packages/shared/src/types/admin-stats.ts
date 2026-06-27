export interface AdminStatsLastAudit {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  workspaceId: string | null;
  createdAt: string;
}

export interface AdminStatsResponse {
  generatedAt: string;
  personsCount: number;
  mediaCount: number;
  mediaBytes: number;
  lastAudit: AdminStatsLastAudit | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string | null;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  isActive: boolean;
  workspaceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminUserSummary[];
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: AdminUserSummary['role'];
  isActive?: boolean;
}

export interface AdminUpdateUserInput {
  displayName?: string;
  role?: AdminUserSummary['role'];
  isActive?: boolean;
  password?: string;
}

export interface AdminSoftDeleteUserInput {
  confirmEmail: string;
  confirmPhrase: string;
}

/** Phrase required for two-step user soft-delete in admin panel. */
export const ADMIN_USER_SOFT_DELETE_PHRASE = 'DELETE';
