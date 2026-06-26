import { Injectable, NotFoundException } from '@nestjs/common';
import type { QuestLeaderboardOptInDto, QuestLeaderboardResponse } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { QuestEngineService } from './quest-engine.service';

@Injectable()
export class QuestLeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly questEngine: QuestEngineService,
  ) {}

  async getLeaderboard(userId: string): Promise<QuestLeaderboardResponse> {
    const workspaceId = this.requireWorkspaceId();
    const metrics = await this.progressCalculator.collectMetrics();
    const quests = this.questEngine.buildQuestInstances(metrics);
    const workspaceScore = this.progressCalculator.buildDiscoveryScore(metrics).total;

    const optIns = await this.prisma.questLeaderboardOptIn.findMany({
      where: { workspaceId, optedIn: true },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    const entries = await Promise.all(
      optIns.map(async (row) => {
        const [completedQuests, actionsThisWeek] = await Promise.all([
          this.prisma.questProgress.count({
            where: { userId: row.userId, status: 'COMPLETED' },
          }),
          this.prisma.gamificationEvent.count({
            where: {
              userId: row.userId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);
        const personalBoost = Math.min(40, actionsThisWeek * 2);
        const questBoost = completedQuests * 15;
        return {
          userId: row.userId,
          displayName: row.displayName ?? row.user.displayName ?? row.user.email.split('@')[0] ?? 'Member',
          score: Math.round(workspaceScore * 0.6 + questBoost + personalBoost),
          completedQuests,
          rank: 0,
        };
      }),
    );

    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    const branchCompletions = await this.buildBranchCompletions(workspaceId);
    const myOptIn = await this.getOptIn(userId, workspaceId);
    const myCompleted = quests.filter((q) => q.status === 'completed').length;

    if (myOptIn.optedIn && !entries.some((e) => e.userId === userId)) {
      entries.push({
        userId,
        displayName: myOptIn.displayName ?? 'You',
        score: Math.round(workspaceScore * 0.6 + myCompleted * 15),
        completedQuests: myCompleted,
        rank: entries.length + 1,
      });
    }

    return { workspaceId, entries, myOptIn, branchCompletions };
  }

  async getOptIn(userId: string, workspaceId?: string): Promise<QuestLeaderboardOptInDto> {
    const wsId = workspaceId ?? this.requireWorkspaceId();
    const row = await this.prisma.questLeaderboardOptIn.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: wsId } },
    });
    return { optedIn: row?.optedIn ?? false, displayName: row?.displayName ?? null };
  }

  async setOptIn(userId: string, optedIn: boolean, displayName?: string | null): Promise<QuestLeaderboardOptInDto> {
    const workspaceId = this.requireWorkspaceId();
    const row = await this.prisma.questLeaderboardOptIn.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, optedIn, displayName: displayName ?? null },
      update: { optedIn, ...(displayName !== undefined ? { displayName } : {}) },
    });
    return { optedIn: row.optedIn, displayName: row.displayName };
  }

  private async buildBranchCompletions(workspaceId: string) {
    const families = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            person: {
              select: { birthDate: true, deathDate: true, biography: true, avatarMediaId: true },
            },
          },
        },
      },
      take: 10,
    });

    return families.map((family) => {
      const members = family.members.map((m) => m.person).filter(Boolean);
      if (members.length === 0) {
        return { familyId: family.id, familyName: family.name ?? 'Branch', percent: 0 };
      }
      const complete = members.filter(
        (p) => p.birthDate && (p.avatarMediaId || p.biography) && (p.deathDate || p.biography),
      ).length;
      const percent = Math.round((complete / members.length) * 100);
      return { familyId: family.id, familyName: family.name ?? 'Branch', percent };
    });
  }

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new NotFoundException('Workspace context required');
    return workspaceId;
  }
}
