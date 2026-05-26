import { Injectable } from '@nestjs/common';
import { QUEST_DEFINITIONS, WEEKLY_QUEST_IDS, type QuestDefinition } from '@family/shared';
import type { QuestInstance, QuestStatus, WeeklyGoalSet } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { TreeMetrics } from './progress-calculator.service';

@Injectable()
export class QuestEngineService {
  constructor(private readonly prisma: PrismaService) {}

  resolveMetricValue(metric: string, metrics: TreeMetrics): number {
    const map: Record<string, number> = {
      personsWithBirthPlace: metrics.personsWithBirthPlace,
      ancestorDocuments: metrics.ancestorDocuments,
      sourcedRelationships: metrics.sourcedRelationships,
      identifiedPhotos: metrics.identifiedPhotos,
      maternalLineDepth: metrics.maternalLineDepth,
      migrationRoutes: metrics.migrationRoutes,
      archiveDocuments: metrics.archiveDocuments,
      completeProfiles: metrics.completeProfiles,
      eventsWithPlace: metrics.eventsWithPlace,
      citations: metrics.citationCount,
    };
    return map[metric] ?? 0;
  }

  buildQuestInstances(metrics: TreeMetrics, stored?: Map<string, { progress: number; status: string; completedAt: Date | null }>): QuestInstance[] {
    return QUEST_DEFINITIONS.map((quest) => {
      const progress = this.resolveMetricValue(quest.metric, metrics);
      const storedRow = stored?.get(quest.id);
      const status = this.resolveStatus(progress, quest.target, storedRow?.status);
      return {
        questId: quest.id,
        category: quest.category,
        titleKey: quest.titleKey,
        descriptionKey: quest.descriptionKey,
        status,
        progress: Math.min(progress, quest.target),
        target: quest.target,
        priority: quest.priority,
        completedAt: storedRow?.completedAt?.toISOString() ?? (status === 'completed' ? new Date().toISOString() : null),
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  buildWeeklyGoals(metrics: TreeMetrics, userId?: string): WeeklyGoalSet {
    const { weekStart, weekEnd } = this.currentWeekBounds();
    const weekKey = weekStart.toISOString();
    const picked = this.pickWeeklyQuests(weekKey);

    const goals: QuestInstance[] = picked.map((questId) => {
      const quest = QUEST_DEFINITIONS.find((q) => q.id === questId)!;
      const progress = this.resolveMetricValue(quest.metric, metrics);
      const status = this.resolveStatus(progress, quest.target);
      return {
        questId: quest.id,
        category: 'weekly',
        titleKey: quest.titleKey,
        descriptionKey: quest.descriptionKey,
        status,
        progress: Math.min(progress, quest.target),
        target: quest.target,
        priority: quest.priority,
        weekStart: weekKey,
        completedAt: status === 'completed' ? new Date().toISOString() : null,
      };
    });

    if (userId) {
      void this.persistWeeklyProgress(userId, goals, weekStart);
    }

    return { weekStart: weekKey, weekEnd: weekEnd.toISOString(), goals };
  }

  getQuestDefinition(questId: string): QuestDefinition | undefined {
    return QUEST_DEFINITIONS.find((q) => q.id === questId);
  }

  private resolveStatus(progress: number, target: number, storedStatus?: string): QuestStatus {
    if (progress >= target) return 'completed';
    if (storedStatus === 'LOCKED') return 'locked';
    if (progress > 0) return 'in_progress';
    return 'available';
  }

  private currentWeekBounds() {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
  }

  private pickWeeklyQuests(weekKey: string): string[] {
    let hash = 0;
    for (let i = 0; i < weekKey.length; i += 1) {
      hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
    }
    const pool = [...WEEKLY_QUEST_IDS];
    const picked: string[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const idx = hash % pool.length;
      picked.push(pool[idx]!);
      pool.splice(idx, 1);
      hash = (hash * 17 + 13) >>> 0;
    }
    return picked;
  }

  private async persistWeeklyProgress(userId: string, goals: QuestInstance[], weekStart: Date) {
    for (const goal of goals) {
      const status = goal.status === 'completed' ? 'COMPLETED' : goal.status === 'in_progress' ? 'IN_PROGRESS' : 'AVAILABLE';
      await this.prisma.questProgress.upsert({
        where: {
          userId_questId_weekStart: {
            userId,
            questId: goal.questId,
            weekStart,
          },
        },
        update: {
          progress: goal.progress,
          target: goal.target,
          status,
          completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
        },
        create: {
          userId,
          questId: goal.questId,
          progress: goal.progress,
          target: goal.target,
          status,
          weekStart,
          completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
        },
      });
    }
  }
}
