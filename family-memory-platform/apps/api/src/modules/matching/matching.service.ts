import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MATCH_SCORE_AUTO_REVIEW_THRESHOLD,
  MATCH_SCORE_REVIEW_THRESHOLD,
} from '@family/shared';
import type { MatchReasonDto, TreeMatchCandidateDto } from '@family/shared';
import { scorePersonMatch } from '@family/matching-core';
import { TreeMatchCandidateStatus, TreeMatchRunStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { MatchingIndexService } from './matching-index.service';
import { MatchingQueueService } from './matching.queue';
import { PersonMatchLoader } from './person-match.loader';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly loader: PersonMatchLoader,
    private readonly index: MatchingIndexService,
    private readonly queue: MatchingQueueService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.matchProfile.upsert({
      where: { userId },
      create: { userId, isOptedIn: false },
      update: {},
    });
    return {
      isOptedIn: profile.isOptedIn,
      optedInAt: profile.optedInAt?.toISOString() ?? null,
    };
  }

  async updateProfile(userId: string, isOptedIn: boolean) {
    const profile = await this.prisma.matchProfile.upsert({
      where: { userId },
      create: {
        userId,
        isOptedIn,
        optedInAt: isOptedIn ? new Date() : null,
      },
      update: {
        isOptedIn,
        optedInAt: isOptedIn ? new Date() : null,
      },
    });

    if (isOptedIn) {
      const workspace = await this.workspaces.ensureDefaultWorkspace(userId);
      await this.reindexWorkspacePersons(workspace.id, userId);
    }

    return {
      isOptedIn: profile.isOptedIn,
      optedInAt: profile.optedInAt?.toISOString() ?? null,
    };
  }

  async listCandidatesForPerson(personId: string, userId: string) {
    await this.requireOptedIn(userId);

    const candidates = await this.prisma.treeMatchCandidate.findMany({
      where: {
        OR: [{ sourcePersonId: personId }, { targetPersonId: personId }],
        status: { in: ['NEW', 'NEEDS_REVIEW'] },
      },
      orderBy: { score: 'desc' },
      take: 50,
    });

    return Promise.all(candidates.map((c) => this.toCandidateDto(c, userId)));
  }

  async getCandidate(candidateId: string, userId: string) {
    await this.requireOptedIn(userId);
    const candidate = await this.prisma.treeMatchCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new NotFoundException('Match candidate not found');
    return this.toCandidateDto(candidate, userId);
  }

  async startFamilyRun(familyId: string, userId: string) {
    await this.requireOptedIn(userId);
    const workspace = await this.workspaces.assignFamilyToUserWorkspace(familyId, userId);

    const run = await this.prisma.treeMatchRun.create({
      data: {
        familyId,
        workspaceId: workspace.id,
        requestedBy: userId,
        status: TreeMatchRunStatus.QUEUED,
      },
    });

    const queued = await this.queue.enqueueRun(run.id, familyId, workspace.id, userId);

    if (!queued.queued) {
      void this.executeRun(run.id).catch((err) =>
        this.logger.error(`Inline matching run failed: ${err.message}`),
      );
    }

    return {
      id: run.id,
      familyId: run.familyId,
      workspaceId: run.workspaceId,
      status: run.status,
      queued: queued.queued,
      createdAt: run.createdAt.toISOString(),
    };
  }

  async executeRun(runId: string) {
    const run = await this.prisma.treeMatchRun.findUnique({ where: { id: runId } });
    if (!run) return;

    await this.prisma.treeMatchRun.update({
      where: { id: runId },
      data: { status: TreeMatchRunStatus.RUNNING },
    });

    try {
      const personIds = await this.loader.loadFamilyPersonIds(run.familyId);
      let created = 0;
      let scanned = 0;

      for (const personId of personIds) {
        const source = await this.loader.loadSnapshot(personId, run.workspaceId);
        if (!source) continue;
        scanned += 1;

        let hits: { personId: string; workspaceId: string }[] = [];
        try {
          const indexHits = await this.index.findCandidatesByBlocking(source, run.workspaceId);
          hits = indexHits.map((h) => ({ personId: h.personId, workspaceId: h.workspaceId }));
        } catch {
          hits = await this.fallbackDbBlocking(source, run.workspaceId);
        }

        for (const hit of hits) {
          if (hit.personId === personId) continue;
          const target = await this.loader.loadSnapshot(hit.personId, hit.workspaceId);
          if (!target) continue;

          const { score, reasons } = scorePersonMatch(source, target);
          if (score < MATCH_SCORE_REVIEW_THRESHOLD) continue;

          const status: TreeMatchCandidateStatus =
            score >= MATCH_SCORE_AUTO_REVIEW_THRESHOLD ? 'NEEDS_REVIEW' : 'NEW';

          await this.prisma.treeMatchCandidate.upsert({
            where: {
              sourcePersonId_targetPersonId: {
                sourcePersonId: personId,
                targetPersonId: hit.personId,
              },
            },
            create: {
              runId,
              sourcePersonId: personId,
              targetPersonId: hit.personId,
              sourceWorkspaceId: run.workspaceId,
              targetWorkspaceId: hit.workspaceId,
              score,
              reasons: reasons as unknown as Prisma.InputJsonValue,
              status,
            },
            update: {
              runId,
              score,
              reasons: reasons as unknown as Prisma.InputJsonValue,
              status: status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : undefined,
            },
          });
          created += 1;
        }
      }

      await this.prisma.treeMatchRun.update({
        where: { id: runId },
        data: {
          status: TreeMatchRunStatus.COMPLETED,
          completedAt: new Date(),
          stats: { scanned, created },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.treeMatchRun.update({
        where: { id: runId },
        data: {
          status: TreeMatchRunStatus.FAILED,
          error: message,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async acceptCandidate(candidateId: string, userId: string) {
    const candidate = await this.ensureCandidateAccess(candidateId, userId);
    if (candidate.status === 'ACCEPTED') {
      return this.toCandidateDto(candidate, userId);
    }

    const updated = await this.prisma.treeMatchCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'ACCEPTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return {
      ...((await this.toCandidateDto(updated, userId)) as TreeMatchCandidateDto),
      mergeSuggestion: {
        message:
          'Match accepted. Automatic merge is disabled — link persons manually in the tree editor.',
        sourcePersonId: updated.sourcePersonId,
        targetPersonId: updated.targetPersonId,
      },
    };
  }

  async rejectCandidate(candidateId: string, userId: string) {
    const candidate = await this.ensureCandidateAccess(candidateId, userId);
    const updated = await this.prisma.treeMatchCandidate.update({
      where: { id: candidateId },
      data: {
        status: 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });
    return this.toCandidateDto(updated, userId);
  }

  async listInbox(userId: string) {
    await this.requireOptedIn(userId);
    const workspace = await this.workspaces.ensureDefaultWorkspace(userId);

    const candidates = await this.prisma.treeMatchCandidate.findMany({
      where: {
        OR: [{ sourceWorkspaceId: workspace.id }, { targetWorkspaceId: workspace.id }],
        status: { in: ['NEW', 'NEEDS_REVIEW'] },
      },
      orderBy: { score: 'desc' },
      take: 100,
    });

    return Promise.all(candidates.map((c) => this.toCandidateDto(c, userId)));
  }

  private async requireOptedIn(userId: string) {
    const profile = await this.getProfile(userId);
    if (!profile.isOptedIn) {
      throw new ForbiddenException('Enable Global Tree Matching in settings before using match features');
    }
  }

  private async ensureCandidateAccess(candidateId: string, userId: string) {
    await this.requireOptedIn(userId);
    const candidate = await this.prisma.treeMatchCandidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Match candidate not found');

    const workspaces = [candidate.sourceWorkspaceId, candidate.targetWorkspaceId];
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: { in: workspaces } },
    });
    if (!member) throw new ForbiddenException('No access to this match candidate');

    return candidate;
  }

  private async reindexWorkspacePersons(workspaceId: string, userId: string) {
    const families = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true },
    });

    for (const family of families) {
      const personIds = await this.loader.loadFamilyPersonIds(family.id);
      for (const personId of personIds) {
        const snapshot = await this.loader.loadSnapshot(personId, workspaceId);
        if (snapshot) {
          try {
            await this.index.upsertPerson({ ...snapshot, workspaceId });
          } catch (err) {
            this.logger.warn(`Index upsert failed for ${personId}: ${(err as Error).message}`);
          }
        }
      }
    }
  }

  private async fallbackDbBlocking(
    source: Awaited<ReturnType<PersonMatchLoader['loadSnapshot']>>,
    excludeWorkspaceId: string,
  ) {
    if (!source) return [];
    const optedInUsers = await this.prisma.matchProfile.findMany({
      where: { isOptedIn: true },
      select: { userId: true },
    });
    const userIds = optedInUsers.map((p) => p.userId);
    if (!userIds.length) return [];

    const workspaces = await this.prisma.workspaceMember.findMany({
      where: { userId: { in: userIds } },
      select: { workspaceId: true },
    });
    const workspaceIds = [...new Set(workspaces.map((w) => w.workspaceId))].filter(
      (id) => id !== excludeWorkspaceId,
    );

    const familyName = source.familyName?.trim();
    if (!familyName) return [];

    const persons = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        familyName: { equals: familyName, mode: 'insensitive' },
        familyMembers: {
          some: { family: { workspaceId: { in: workspaceIds } }, deletedAt: null },
        },
      },
      take: 30,
      select: { id: true },
    });

    return persons.map((p) => ({
      personId: p.id,
      workspaceId: workspaceIds[0] ?? '',
    }));
  }

  private async toCandidateDto(
    candidate: {
      id: string;
      sourcePersonId: string;
      targetPersonId: string;
      sourceWorkspaceId: string;
      targetWorkspaceId: string;
      score: number;
      reasons: unknown;
      status: TreeMatchCandidateStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    userId: string,
  ): Promise<TreeMatchCandidateDto> {
    const [sourcePerson, targetPerson, sourceWs, targetWs] = await Promise.all([
      this.prisma.person.findUnique({
        where: { id: candidate.sourcePersonId },
        select: { id: true, givenName: true, familyName: true, patronymic: true, birthDate: true, deathDate: true },
      }),
      this.prisma.person.findUnique({
        where: { id: candidate.targetPersonId },
        select: { id: true, givenName: true, familyName: true, patronymic: true, birthDate: true, deathDate: true },
      }),
      this.prisma.workspace.findUnique({ where: { id: candidate.sourceWorkspaceId }, select: { name: true } }),
      this.prisma.workspace.findUnique({ where: { id: candidate.targetWorkspaceId }, select: { name: true } }),
    ]);

    const display = (p: NonNullable<typeof sourcePerson>) => ({
      id: p.id,
      displayName: [p.givenName, p.patronymic, p.familyName].filter(Boolean).join(' '),
      birthYear: p.birthDate?.getUTCFullYear() ?? null,
      deathYear: p.deathDate?.getUTCFullYear() ?? null,
    });

    return {
      id: candidate.id,
      sourcePersonId: candidate.sourcePersonId,
      targetPersonId: candidate.targetPersonId,
      sourceWorkspaceId: candidate.sourceWorkspaceId,
      targetWorkspaceId: candidate.targetWorkspaceId,
      score: candidate.score,
      reasons: (candidate.reasons as MatchReasonDto[]) ?? [],
      status: candidate.status,
      createdAt: candidate.createdAt.toISOString(),
      updatedAt: candidate.updatedAt.toISOString(),
      sourcePerson: sourcePerson
        ? { ...display(sourcePerson), workspaceLabel: sourceWs?.name }
        : undefined,
      targetPerson: targetPerson
        ? { ...display(targetPerson), workspaceLabel: targetWs?.name }
        : undefined,
    };
  }
}
