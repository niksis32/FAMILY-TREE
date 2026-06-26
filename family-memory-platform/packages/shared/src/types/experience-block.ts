/** BLOCK 4 — Experience & Retention contracts */

export type OnboardingStepId =
  | 'welcome'
  | 'create_tree'
  | 'add_person'
  | 'upload_photo'
  | 'invite_family'
  | 'complete';

export interface OnboardingProgressDto {
  id: string;
  userId: string;
  workspaceId: string;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  skippedSteps: OnboardingStepId[];
  isCompleted: boolean;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export type StoryLocaleStatusId = 'draft' | 'translating' | 'ready' | 'failed';

export interface StoryLocaleDto {
  id: string;
  storyId: string;
  locale: string;
  sourceLocale: string;
  title: string | null;
  narrativeText: string | null;
  status: StoryLocaleStatusId;
  translatedAt: string | null;
  updatedAt: string;
}

export interface StoryTranslationJobDto {
  id: string;
  storyId: string;
  targetLocale: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface QuestLeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  completedQuests: number;
  rank: number;
}

export interface QuestLeaderboardOptInDto {
  optedIn: boolean;
  displayName: string | null;
}

export interface QuestLeaderboardResponse {
  workspaceId: string;
  entries: QuestLeaderboardEntry[];
  myOptIn: QuestLeaderboardOptInDto;
  branchCompletions: Array<{ familyId: string; familyName: string; percent: number }>;
}
