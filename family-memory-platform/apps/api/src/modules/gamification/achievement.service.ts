import { Injectable } from '@nestjs/common';
import { ACHIEVEMENT_DEFINITIONS } from '@family/shared';
import type { UserAchievementRecord } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { TreeMetrics } from './progress-calculator.service';

@Injectable()
export class AchievementService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string | undefined, metrics: TreeMetrics): Promise<UserAchievementRecord[]> {
    const unlocked = userId
      ? await this.prisma.userAchievement.findMany({ where: { userId } })
      : [];
    const unlockedMap = new Map(unlocked.map((row) => [row.achievementId, row.unlockedAt]));

    return ACHIEVEMENT_DEFINITIONS.map((def) => ({
      achievementId: def.id,
      tier: def.tier,
      titleKey: def.titleKey,
      descriptionKey: def.descriptionKey,
      unlocked: unlockedMap.has(def.id) || this.isConditionMet(def.condition, metrics),
      unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
    }));
  }

  async checkAndUnlock(userId: string, metrics: TreeMetrics): Promise<string[]> {
    const newlyUnlocked: string[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (!this.isConditionMet(def.condition, metrics)) continue;

      const existing = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: def.id } },
      });
      if (existing) continue;

      await this.prisma.userAchievement.create({
        data: { userId, achievementId: def.id },
      });
      newlyUnlocked.push(def.id);
    }

    return newlyUnlocked;
  }

  private isConditionMet(condition: string, metrics: TreeMetrics): boolean {
    const rules: Record<string, boolean> = {
      'documents >= 1': metrics.documentCount >= 1,
      'citations >= 1': metrics.citationCount >= 1,
      'migrationEvents >= 1': metrics.migrationEvents >= 1,
      'identifiedPhotos >= 5': metrics.identifiedPhotos >= 5,
      'migrationRoutes >= 1': metrics.migrationRoutes >= 1,
      'maxLineDepth >= 4': metrics.maxLineDepth >= 4,
      'ocrDocuments >= 3': metrics.ocrDocuments >= 3,
      'completeProfiles >= 1': metrics.completeProfiles >= 1,
    };
    return rules[condition] ?? false;
  }
}
