export type TreeMatchCandidateStatus = 'NEW' | 'ACCEPTED' | 'REJECTED' | 'NEEDS_REVIEW';

export interface MatchReasonDto {
  type: string;
  weight: number;
  explanation: string;
}

export interface TreeMatchCandidateDto {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  sourceWorkspaceId: string;
  targetWorkspaceId: string;
  score: number;
  reasons: MatchReasonDto[];
  status: TreeMatchCandidateStatus;
  createdAt: string;
  updatedAt: string;
  sourcePerson?: PersonMatchPreview;
  targetPerson?: PersonMatchPreview;
}

export interface PersonMatchPreview {
  id: string;
  displayName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  workspaceLabel?: string;
}

export interface MatchProfileDto {
  isOptedIn: boolean;
  optedInAt?: string | null;
}

export interface TreeMatchRunDto {
  id: string;
  familyId: string;
  workspaceId: string;
  status: string;
  stats?: Record<string, unknown> | null;
  createdAt: string;
  completedAt?: string | null;
}
