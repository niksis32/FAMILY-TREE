import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { MergePreview } from '@family/shared';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ActivityRecorderService } from '../activity-feed/activity-recorder.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class DuplicateMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityRecorderService,
    private readonly search: SearchService,
  ) {}

  async preview(survivorId: string, mergedId: string, user: AuthenticatedUser): Promise<MergePreview> {
    if (survivorId === mergedId) {
      throw new BadRequestException('Survivor and merged person must differ');
    }

    const [survivor, merged] = await Promise.all([
      this.loadPerson(survivorId),
      this.loadPerson(mergedId),
    ]);

    await this.assertCanMerge(survivor, merged, user);

    const [
      relationshipsFrom,
      relationshipsTo,
      events,
      documents,
      media,
      citations,
      timelineItems,
    ] = await Promise.all([
      this.prisma.relationship.count({ where: { fromPersonId: mergedId, deletedAt: null } }),
      this.prisma.relationship.count({ where: { toPersonId: mergedId, deletedAt: null } }),
      this.prisma.event.count({ where: { personId: mergedId, deletedAt: null } }),
      this.prisma.document.count({ where: { personId: mergedId, deletedAt: null } }),
      this.prisma.media.count({ where: { personId: mergedId, deletedAt: null } }),
      this.prisma.citation.count({ where: { personId: mergedId, deletedAt: null } }),
      this.prisma.timelineItem.count({ where: { personId: mergedId, deletedAt: null } }),
    ]);

    const fieldDiffs = this.buildFieldDiffs(survivor, merged);
    const warnings: string[] = [];

    if (survivor.isLiving && merged.deathDate) {
      warnings.push('Объединение живого человека с записью, у которой указана дата смерти');
    }
    if (survivor.workspaceId !== merged.workspaceId) {
      warnings.push('Персоны из разных workspace — merge запрещён');
    }

    return {
      survivorId,
      mergedId,
      survivorName: this.personLabel(survivor),
      mergedName: this.personLabel(merged),
      fieldDiffs,
      repointCounts: {
        relationships: relationshipsFrom + relationshipsTo,
        events,
        documents,
        media,
        citations,
        timelineItems,
      },
      warnings,
    };
  }

  async execute(survivorId: string, mergedId: string, user: AuthenticatedUser, confirm = false) {
    if (!confirm) {
      throw new BadRequestException('Merge requires explicit confirm=true — no auto-merge');
    }

    const preview = await this.preview(survivorId, mergedId, user);
    if (preview.warnings.some((w) => w.includes('запрещён'))) {
      throw new BadRequestException('Cross-workspace merge is not allowed');
    }

    const [survivor, merged] = await Promise.all([
      this.loadPerson(survivorId),
      this.loadPerson(mergedId),
    ]);

    const snapshot = {
      survivor: this.personSnapshot(survivor),
      merged: this.personSnapshot(merged),
    };

    const audit = await this.prisma.$transaction(async (tx) => {
      await tx.relationship.updateMany({
        where: { fromPersonId: mergedId, deletedAt: null },
        data: { fromPersonId: survivorId },
      });
      await tx.relationship.updateMany({
        where: { toPersonId: mergedId, deletedAt: null },
        data: { toPersonId: survivorId },
      });
      await tx.event.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.document.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.media.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.citation.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.timelineItem.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.familyMember.updateMany({ where: { personId: mergedId, deletedAt: null }, data: { personId: survivorId } });
      await tx.photoFaceTag.updateMany({ where: { personId: mergedId }, data: { personId: survivorId } });
      await tx.personNameAlias.updateMany({ where: { personId: mergedId }, data: { personId: survivorId } });

      const mergedFields = this.resolveSurvivorFields(survivor, merged);
      await tx.person.update({
        where: { id: survivorId },
        data: {
          ...mergedFields,
          updatedAt: new Date(),
        },
      });

      await tx.person.update({
        where: { id: mergedId },
        data: { deletedAt: new Date() },
      });

      await tx.treeMatchCandidate.updateMany({
        where: {
          OR: [{ sourcePersonId: mergedId }, { targetPersonId: mergedId }],
        },
        data: { status: 'REJECTED' },
      });

      return tx.personMergeAudit.create({
        data: {
          workspaceId: survivor.workspaceId,
          survivorId,
          mergedId,
          performedBy: user.id,
          preview: preview as unknown as Prisma.InputJsonValue,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    });

    await this.search.indexPerson(survivorId);

    await this.activity.record({
      workspaceId: survivor.workspaceId,
      actorUserId: user.id,
      type: 'CUSTOM',
      summary: `Объединены дубликаты: ${preview.mergedName} → ${preview.survivorName}`,
      deepLink: `/persons/${survivorId}`,
      entityType: 'person',
      entityId: survivorId,
      metadata: { mergeAuditId: audit.id, mergedId },
    });

    return {
      auditId: audit.id,
      survivorId,
      mergedId,
      preview,
    };
  }

  async listAudits(limit = 50) {
    const rows = await this.prisma.personMergeAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r: { id: string; survivorId: string; mergedId: string; performedBy: string; createdAt: Date }) => ({
      id: r.id,
      survivorId: r.survivorId,
      mergedId: r.mergedId,
      performedBy: r.performedBy,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async loadPerson(id: string) {
    const person = await this.prisma.person.findFirst({ where: { id, deletedAt: null } });
    if (!person) throw new NotFoundException(`Person ${id} not found`);
    return person;
  }

  private async assertCanMerge(
    survivor: { workspaceId: string; privacyLevel: string; isLiving: boolean },
    merged: { workspaceId: string },
    user: AuthenticatedUser,
  ) {
    if (survivor.workspaceId !== merged.workspaceId) {
      throw new BadRequestException('Persons must belong to the same workspace');
    }
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: survivor.workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member && user.role !== 'ADMIN') {
      throw new BadRequestException('Insufficient permissions to merge persons');
    }
    if (member && member.role === 'VIEWER' && user.role !== 'ADMIN') {
      throw new BadRequestException('Insufficient permissions to merge persons');
    }
  }

  private personLabel(p: { givenName: string; patronymic: string | null; familyName: string | null }) {
    return [p.givenName, p.patronymic, p.familyName].filter(Boolean).join(' ');
  }

  private personSnapshot(p: {
    id: string;
    givenName: string;
    patronymic: string | null;
    familyName: string | null;
    birthDate: Date | null;
    deathDate: Date | null;
    biography: string | null;
  }) {
    return {
      id: p.id,
      name: this.personLabel(p),
      birthDate: p.birthDate?.toISOString() ?? null,
      deathDate: p.deathDate?.toISOString() ?? null,
      biography: p.biography,
    };
  }

  private buildFieldDiffs(
    survivor: {
      givenName: string;
      patronymic: string | null;
      familyName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      biography: string | null;
      gender: string | null;
    },
    merged: {
      givenName: string;
      patronymic: string | null;
      familyName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      biography: string | null;
      gender: string | null;
    },
  ) {
    const fields: Array<{ field: string; survivorValue: unknown; mergedValue: unknown }> = [
      { field: 'givenName', survivorValue: survivor.givenName, mergedValue: merged.givenName },
      { field: 'patronymic', survivorValue: survivor.patronymic, mergedValue: merged.patronymic },
      { field: 'familyName', survivorValue: survivor.familyName, mergedValue: merged.familyName },
      { field: 'birthDate', survivorValue: survivor.birthDate, mergedValue: merged.birthDate },
      { field: 'deathDate', survivorValue: survivor.deathDate, mergedValue: merged.deathDate },
      { field: 'gender', survivorValue: survivor.gender, mergedValue: merged.gender },
      { field: 'biography', survivorValue: survivor.biography, mergedValue: merged.biography },
    ];

    return fields
      .filter((f) => JSON.stringify(f.survivorValue) !== JSON.stringify(f.mergedValue))
      .map((f) => ({
        ...f,
        resolution: (f.survivorValue == null || f.survivorValue === '' ? 'merged' : 'survivor') as
          | 'survivor'
          | 'merged'
          | 'combine',
      }));
  }

  private resolveSurvivorFields(
    survivor: {
      patronymic: string | null;
      familyName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      biography: string | null;
      gender: string | null;
      avatarMediaId: string | null;
    },
    merged: {
      patronymic: string | null;
      familyName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      biography: string | null;
      gender: string | null;
      avatarMediaId: string | null;
    },
  ) {
    return {
      patronymic: survivor.patronymic ?? merged.patronymic,
      familyName: survivor.familyName ?? merged.familyName,
      birthDate: survivor.birthDate ?? merged.birthDate,
      deathDate: survivor.deathDate ?? merged.deathDate,
      gender: (survivor.gender ?? merged.gender) as Gender | null,
      avatarMediaId: survivor.avatarMediaId ?? merged.avatarMediaId,
      biography:
        survivor.biography && merged.biography
          ? `${survivor.biography}\n\n---\n\n${merged.biography}`
          : survivor.biography ?? merged.biography,
    };
  }
}
