import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MATCH_SCORE_AUTO_REVIEW_THRESHOLD,
  MATCH_SCORE_REVIEW_THRESHOLD,
} from '@family/shared';
import type { MatchReasonDto, TreeMatchCandidateDto } from '@family/shared';
import { TreeMatchCandidateStatus, TreeMatchRunStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessControlService } from '../privacy/access-control.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { MatchingIndexService } from './matching-index.service';
import { isCrossWorkspace, isEligibleForGlobalMatching } from './matching-privacy.util';
import { MatchingQueueService } from './matching.queue';
import { MatchingScoringService } from './matching-scoring.service';
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
    private readonly scoring: MatchingScoringService,
    private readonly access: AccessControlService,
  ) {}

  getScoringInfo() {
    return {
      defaultMethod: 'heuristic',
      hybridAiEnabled: this.scoring.isAiScoringEnabled(),
      env: {
        MATCHING_AI_SCORING_ENABLED:
          process.env.MATCHING_AI_SCORING_ENABLED === 'true' ? 'true' : 'false',
        AI_SERVICE_ENABLED: process.env.AI_SERVICE_ENABLED === 'true' ? 'true' : 'false',
      },
    };
  }

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
      let hybridScores = 0;
      let heuristicScores = 0;

      for (const personId of personIds) {
        const source = await this.loader.loadSnapshot(personId, run.workspaceId);
        if (!source || !isEligibleForGlobalMatching(source)) continue;
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

          if (
            isCrossWorkspace(run.workspaceId, hit.workspaceId) &&
            (!isEligibleForGlobalMatching(target) ||
              !isEligibleForGlobalMatching(source))
          ) {
            continue;
          }

          const scored = await this.scoring.scorePair(
            source,
            target,
            run.requestedBy
              ? { userId: run.requestedBy, workspaceId: run.workspaceId }
              : undefined,
          );
          const { score, reasons, scoringMethod } = scored;
          if (scoringMethod === 'hybrid') hybridScores += 1;
          else heuristicScores += 1;
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
          stats: {
            scanned,
            created,
            scoring: { hybrid: hybridScores, heuristic: heuristicScores },
            scoringMode: this.scoring.isAiScoringEnabled() ? 'hybrid_when_available' : 'heuristic',
          },
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
    await this.ensureCandidateAccess(candidateId, userId);
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

  private async reindexWorkspacePersons(workspaceId: string, _userId: string) {
    const families = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true },
    });

    for (const family of families) {
      const personIds = await this.loader.loadFamilyPersonIds(family.id);
      for (const personId of personIds) {
        const snapshot = await this.loader.loadSnapshot(personId, workspaceId);
        if (snapshot && isEligibleForGlobalMatching(snapshot)) {
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
        privacyLevel: { not: 'PRIVATE' },
        familyName: { equals: familyName, mode: 'insensitive' },
        familyMembers: {
          some: { family: { workspaceId: { in: workspaceIds } }, deletedAt: null },
        },
      },
      take: 30,
      select: { id: true, workspaceId: true },
    });

    return persons.map((p) => ({
      personId: p.id,
      workspaceId: p.workspaceId,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const viewer = this.access.viewerFromUser(
      user ? { id: userId, role: user.role } : null,
    );

    const [sourcePerson, targetPerson, sourceWs, targetWs] = await Promise.all([
      this.prisma.person.findUnique({
        where: { id: candidate.sourcePersonId },
        select: {
          id: true,
          givenName: true,
          familyName: true,
          patronymic: true,
          birthDate: true,
          deathDate: true,
          isLiving: true,
          privacyLevel: true,
          biography: true,
        },
      }),
      this.prisma.person.findUnique({
        where: { id: candidate.targetPersonId },
        select: {
          id: true,
          givenName: true,
          familyName: true,
          patronymic: true,
          birthDate: true,
          deathDate: true,
          isLiving: true,
          privacyLevel: true,
          biography: true,
        },
      }),
      this.prisma.workspace.findUnique({ where: { id: candidate.sourceWorkspaceId }, select: { name: true } }),
      this.prisma.workspace.findUnique({ where: { id: candidate.targetWorkspaceId }, select: { name: true } }),
    ]);

    const hideLiving = await this.access.familyHideLiving(
      (await this.prisma.familyMember.findFirst({
        where: { personId: candidate.sourcePersonId, deletedAt: null },
        select: { familyId: true },
      }))?.familyId ?? '',
    ).catch(() => true);

    const display = (
      p: NonNullable<typeof sourcePerson>,
      workspaceLabel?: string | null,
    ) => {
      const record = {
        id: p.id,
        givenName: p.givenName,
        patronymic: p.patronymic,
        familyName: p.familyName,
        birthDate: p.birthDate?.toISOString() ?? null,
        deathDate: p.deathDate?.toISOString() ?? null,
        isLiving: p.isLiving,
        privacyLevel: p.privacyLevel.toLowerCase(),
        biography: p.biography,
      };

      if (!this.access.canViewPersonRecord(record, viewer, hideLiving)) {
        return {
          id: p.id,
          displayName: 'Restricted person',
          birthYear: null,
          deathYear: null,
          workspaceLabel: workspaceLabel ?? undefined,
          redacted: true,
        };
      }

      const redacted = this.access.redactPerson(record, viewer, hideLiving);
      if (!redacted) {
        return {
          id: p.id,
          displayName: 'Restricted person',
          birthYear: null,
          deathYear: null,
          workspaceLabel: workspaceLabel ?? undefined,
          redacted: true,
        };
      }

      return {
        id: p.id,
        displayName: [redacted.givenName, redacted.patronymic, redacted.familyName]
          .filter(Boolean)
          .join(' '),
        birthYear: redacted.birthDate ? new Date(redacted.birthDate).getUTCFullYear() : null,
        deathYear: redacted.deathDate ? new Date(redacted.deathDate).getUTCFullYear() : null,
        workspaceLabel: workspaceLabel ?? undefined,
      };
    };

    const reasonsRaw = candidate.reasons;
    const reasonsList = Array.isArray(reasonsRaw) ? (reasonsRaw as MatchReasonDto[]) : [];
    const scoringMethod = reasonsList.some((r) => r.type?.startsWith('ML_') || r.type === 'SCORING_BLEND')
      ? 'hybrid'
      : 'heuristic';

    return {
      id: candidate.id,
      sourcePersonId: candidate.sourcePersonId,
      targetPersonId: candidate.targetPersonId,
      sourceWorkspaceId: candidate.sourceWorkspaceId,
      targetWorkspaceId: candidate.targetWorkspaceId,
      score: candidate.score,
      reasons: reasonsList,
      scoringMethod,
      status: candidate.status,
      createdAt: candidate.createdAt.toISOString(),
      updatedAt: candidate.updatedAt.toISOString(),
      sourcePerson: sourcePerson ? display(sourcePerson, sourceWs?.name) : undefined,
      targetPerson: targetPerson ? display(targetPerson, targetWs?.name) : undefined,
    };
  }
}
