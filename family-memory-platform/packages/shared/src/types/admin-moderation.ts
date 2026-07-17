export interface AdminModerationQueueStats {
  generatedAt: string;
  militaryConflicts: number;
  total: number;
}

export interface AdminMilitaryConflictPending {
  id: string;
  name: string;
  color: string | null;
  workspaceId: string;
  workspaceName: string;
  proposerLabel: string | null;
  createdById: string | null;
  createdAt: string;
}
