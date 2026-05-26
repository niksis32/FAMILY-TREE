/** Quest / gamification contracts — premium family research experience */

export type QuestCategory =
  | 'ancestor'
  | 'regional'
  | 'document'
  | 'photo'
  | 'migration'
  | 'missing-data'
  | 'weekly';

export type QuestStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'archive';

export interface ResearchProgressCategory {
  key: string;
  labelKey: string;
  percent: number;
  current: number;
  target: number;
}

export interface ResearchProgressSnapshot {
  overallPercent: number;
  categories: ResearchProgressCategory[];
  computedAt: string;
}

export interface DiscoveryScoreBreakdown {
  persons: number;
  relationships: number;
  events: number;
  documents: number;
  citations: number;
  media: number;
  geo: number;
}

export interface FamilyDiscoveryScore {
  total: number;
  breakdown: DiscoveryScoreBreakdown;
  computedAt: string;
}

export interface QuestDefinition {
  id: string;
  category: QuestCategory;
  titleKey: string;
  descriptionKey: string;
  target: number;
  metric: string;
  priority: number;
}

export interface QuestInstance {
  questId: string;
  category: QuestCategory;
  titleKey: string;
  descriptionKey: string;
  status: QuestStatus;
  progress: number;
  target: number;
  priority: number;
  completedAt?: string | null;
  weekStart?: string | null;
}

export interface AchievementDefinition {
  id: string;
  tier: AchievementTier;
  titleKey: string;
  descriptionKey: string;
  condition: string;
}

export interface UserAchievementRecord {
  achievementId: string;
  tier: AchievementTier;
  titleKey: string;
  descriptionKey: string;
  unlockedAt: string | null;
  unlocked: boolean;
}

export interface MissingDataGap {
  code: string;
  entityId: string;
  entityType: 'person' | 'relationship' | 'event' | 'document' | 'media';
  entityLabel: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  hintKey: string;
}

export interface FamilyMystery {
  id: string;
  titleKey: string;
  descriptionKey: string;
  personId?: string | null;
  personName?: string | null;
  severity: 'critical' | 'high' | 'medium';
  ctaHref: string;
  ctaKey: string;
}

export interface UserResearchProgress {
  userId: string;
  actionsTotal: number;
  actionsThisWeek: number;
  streakDays: number;
  lastActiveAt: string | null;
}

export interface TreeResearchProgress {
  personCount: number;
  documentedPercent: number;
  sourcedFacts: number;
  identifiedPhotos: number;
  migrationPoints: number;
}

export interface WeeklyGoalSet {
  weekStart: string;
  weekEnd: string;
  goals: QuestInstance[];
}

export interface GamificationDashboardPayload {
  researchProgress: ResearchProgressSnapshot;
  discoveryScore: FamilyDiscoveryScore;
  treeProgress: TreeResearchProgress;
  userProgress: UserResearchProgress | null;
  quests: QuestInstance[];
  weeklyGoals: WeeklyGoalSet;
  achievements: UserAchievementRecord[];
  gaps: MissingDataGap[];
  mysteries: FamilyMystery[];
}
