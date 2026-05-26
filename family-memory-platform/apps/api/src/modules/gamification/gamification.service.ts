import { Injectable } from '@nestjs/common';
import type {
  FamilyMystery,
  GamificationDashboardPayload,
  UserResearchProgress,
} from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from './achievement.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { QuestEngineService } from './quest-engine.service';

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly questEngine: QuestEngineService,
    private readonly achievementService: AchievementService,
  ) {}

  async getDashboard(userId?: string): Promise<GamificationDashboardPayload> {
    const metrics = await this.progressCalculator.collectMetrics();

    if (userId) {
      await this.achievementService.checkAndUnlock(userId, metrics);
    }

    const [researchProgress, gaps] = await Promise.all([
      this.progressCalculator.buildResearchProgress(metrics),
      this.progressCalculator.collectMissingDataGaps(),
    ]);

    const discoveryScore = this.progressCalculator.buildDiscoveryScore(metrics);
    const treeProgress = this.progressCalculator.buildTreeProgress(metrics);
    const quests = this.questEngine.buildQuestInstances(metrics);
    const weeklyGoals = this.questEngine.buildWeeklyGoals(metrics, userId);
    const achievements = await this.achievementService.listForUser(userId, metrics);
    const userProgress = userId ? await this.buildUserProgress(userId) : null;
    const mysteries = this.buildMysteries(gaps);

    void this.cacheScoreSnapshot(discoveryScore.total, discoveryScore.breakdown);

    return {
      researchProgress,
      discoveryScore,
      treeProgress,
      userProgress,
      quests,
      weeklyGoals,
      achievements,
      gaps,
      mysteries,
    };
  }

  async getProgress(userId?: string) {
    const metrics = await this.progressCalculator.collectMetrics();
    return {
      researchProgress: await this.progressCalculator.buildResearchProgress(metrics),
      treeProgress: this.progressCalculator.buildTreeProgress(metrics),
      userProgress: userId ? await this.buildUserProgress(userId) : null,
    };
  }

  async getScore() {
    const metrics = await this.progressCalculator.collectMetrics();
    return this.progressCalculator.buildDiscoveryScore(metrics);
  }

  async getQuests(userId?: string) {
    const metrics = await this.progressCalculator.collectMetrics();
    return {
      quests: this.questEngine.buildQuestInstances(metrics),
      weeklyGoals: this.questEngine.buildWeeklyGoals(metrics, userId),
    };
  }

  async getAchievements(userId?: string) {
    const metrics = await this.progressCalculator.collectMetrics();
    return this.achievementService.listForUser(userId, metrics);
  }

  async getGaps() {
    return this.progressCalculator.collectMissingDataGaps();
  }

  async getMysteries() {
    const gaps = await this.progressCalculator.collectMissingDataGaps();
    return this.buildMysteries(gaps);
  }

  private async buildUserProgress(userId: string): Promise<UserResearchProgress> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);

    const [actionsTotal, actionsThisWeek, lastEvent] = await Promise.all([
      this.prisma.gamificationEvent.count({ where: { userId } }),
      this.prisma.gamificationEvent.count({ where: { userId, createdAt: { gte: weekStart } } }),
      this.prisma.gamificationEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const streakDays = await this.computeStreakDays(userId);

    return {
      userId,
      actionsTotal,
      actionsThisWeek,
      streakDays,
      lastActiveAt: lastEvent?.createdAt.toISOString() ?? null,
    };
  }

  private async computeStreakDays(userId: string): Promise<number> {
    const events = await this.prisma.gamificationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
      take: 60,
    });
    if (events.length === 0) return 0;

    const daySet = new Set(events.map((e) => e.createdAt.toISOString().slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }

  private buildMysteries(gaps: Awaited<ReturnType<ProgressCalculatorService['collectMissingDataGaps']>>): FamilyMystery[] {
    const top = gaps.slice(0, 5);
    return top.map((gap) => ({
      id: `mystery-${gap.entityId}-${gap.code}`,
      titleKey: 'gamification.mystery.title',
      descriptionKey: gap.hintKey,
      personId: gap.entityType === 'person' ? gap.entityId : null,
      personName: gap.entityType === 'person' ? gap.entityLabel : null,
      severity: gap.severity === 'low' ? 'medium' : gap.severity,
      ctaHref: gap.entityType === 'person' ? `/persons/${gap.entityId}` : '/persons',
      ctaKey: 'gamification.mystery.cta',
    }));
  }

  private async cacheScoreSnapshot(score: number, breakdown: unknown) {
    try {
      await this.prisma.researchScoreSnapshot.create({
        data: { score, breakdown: breakdown as object },
      });
    } catch {
      // Non-blocking cache write
    }
  }
}
