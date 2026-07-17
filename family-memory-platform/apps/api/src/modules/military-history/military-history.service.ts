import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MilitaryConflictStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { MessengerService } from '../messenger/messenger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MILITARY_CONFLICT_MODERATION_INBOX_TITLE } from '@family/shared';
import type { ApproveMilitaryConflictDto, CreateMilitaryConflictDto } from './military-history.dto';

const MAX_CUSTOM_CONFLICTS = 50;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

type ConflictRow = {
  id: string;
  name: string;
  color: string | null;
  status: MilitaryConflictStatus;
  createdById: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { displayName: string | null; email: string } | null;
};

@Injectable()
export class MilitaryHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly notifications: NotificationsService,
    private readonly messenger: MessengerService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  private sanitizeName(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (CONTROL_CHARS.test(trimmed)) {
      throw new BadRequestException('name contains invalid control characters');
    }
    return trimmed;
  }

  private mapRow(row: ConflictRow, proposerLabel?: string | null) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      status: row.status,
      isCustom: true,
      proposerLabel: proposerLabel ?? null,
      createdById: row.createdById,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async requirePlatformAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only platform admin can moderate menu conflicts');
    }
  }

  private async moderatorUserIds(_workspaceId: string): Promise<string[]> {
    const platformAdmins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null, isActive: true },
      select: { id: true },
    });
    return platformAdmins.map((a) => a.id);
  }

  private async userLabel(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true },
    });
    return user?.displayName ?? user?.email ?? 'Участник';
  }

  private async assertNameAvailable(workspaceId: string, name: string, excludeId?: string) {
    const duplicate = await this.prisma.militaryConflictDefinition.findFirst({
      where: {
        workspaceId,
        status: { in: ['PENDING', 'APPROVED'] },
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (duplicate) throw new BadRequestException('A conflict with this name already exists or is pending review');
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A conflict with this name already exists or is pending review');
      }
      if (error.code === 'P2021' || error.code === 'P2022') {
        throw new InternalServerErrorException(
          'Military conflicts table is missing. Run: pnpm db:migrate && pnpm api:build',
        );
      }
      if (error.code === 'P2011') {
        throw new InternalServerErrorException(
          'Military conflict could not be saved (workspace context). Restart API after pnpm api:build.',
        );
      }
    }
    throw error;
  }

  async listApprovedConflicts(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    try {
      const rows = await this.prisma.militaryConflictDefinition.findMany({
        where: { workspaceId, status: 'APPROVED' },
        orderBy: { name: 'asc' },
      });
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async countPendingForPlatformAdmin(userId: string): Promise<number> {
    await this.requirePlatformAdmin(userId);
    return this.workspaceContext.runBypass(() =>
      this.prisma.militaryConflictDefinition.count({ where: { status: 'PENDING' } }),
    );
  }

  async getModerationQueueStats(userId: string) {
    const militaryConflicts = await this.countPendingForPlatformAdmin(userId);
    return {
      generatedAt: new Date().toISOString(),
      militaryConflicts,
      total: militaryConflicts,
    };
  }

  async listAllPendingForPlatformAdmin(userId: string) {
    await this.requirePlatformAdmin(userId);
    return this.workspaceContext.runBypass(async () => {
      const rows = await this.prisma.militaryConflictDefinition.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
          createdBy: { select: { displayName: true, email: true } },
          workspace: { select: { id: true, name: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        workspaceId: row.workspaceId,
        workspaceName: row.workspace.name,
        proposerLabel: row.createdBy?.displayName ?? row.createdBy?.email ?? null,
        createdById: row.createdById,
        createdAt: row.createdAt.toISOString(),
      }));
    });
  }

  async listPendingConflicts(userId: string) {
    return this.listAllPendingForPlatformAdmin(userId);
  }

  async listMyProposals(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const rows = await this.prisma.militaryConflictDefinition.findMany({
      where: { workspaceId, createdById: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async proposeConflict(userId: string, dto: CreateMilitaryConflictDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const name = this.sanitizeName(dto.name);

    const approvedCount = await this.prisma.militaryConflictDefinition.count({
      where: { workspaceId, status: 'APPROVED' },
    });
    if (approvedCount >= MAX_CUSTOM_CONFLICTS) {
      throw new BadRequestException(`Maximum ${MAX_CUSTOM_CONFLICTS} approved conflicts per workspace`);
    }

    await this.assertNameAvailable(workspaceId, name);

    let row: ConflictRow;
    try {
      row = await this.prisma.militaryConflictDefinition.create({
        data: {
          workspaceId,
          name,
          color: dto.color ?? null,
          status: 'PENDING',
          createdById: userId,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }

    const proposerLabel = await this.userLabel(userId);
    const moderators = await this.moderatorUserIds(workspaceId);
    for (const modId of moderators) {
      if (modId === userId) continue;
      try {
        await this.notifications.deliver({
          workspaceId,
          userId: modId,
          source: 'MODERATION',
          title: MILITARY_CONFLICT_MODERATION_INBOX_TITLE,
          body: `${proposerLabel} предлагает добавить: «${name}». Откройте админ-панель → Модерация.`,
          deepLink: `/admin/moderation/military-history?review=${row.id}`,
          sourceId: row.id,
        });
      } catch {
        /* notification delivery must not block proposal */
      }
    }

    return this.mapRow(row);
  }

  async approveConflict(userId: string, id: string, dto: ApproveMilitaryConflictDto) {
    await this.requirePlatformAdmin(userId);
    return this.workspaceContext.runBypass(async () => {
      const row = await this.prisma.militaryConflictDefinition.findFirst({
        where: { id, status: 'PENDING' },
      });
      if (!row) throw new NotFoundException('Pending conflict proposal not found');

      const workspaceId = row.workspaceId;
      const finalName = this.sanitizeName(dto.name ?? row.name);
      await this.assertNameAvailable(workspaceId, finalName, row.id);

      const approvedCount = await this.prisma.militaryConflictDefinition.count({
        where: { workspaceId, status: 'APPROVED' },
      });
      if (approvedCount >= MAX_CUSTOM_CONFLICTS) {
        throw new BadRequestException(`Maximum ${MAX_CUSTOM_CONFLICTS} approved conflicts per workspace`);
      }

      const updated = await this.prisma.militaryConflictDefinition.update({
        where: { id: row.id },
        data: {
          name: finalName,
          color: dto.color ?? row.color,
          status: 'APPROVED',
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      if (row.createdById) {
        const chatBody = `Ваше название «${finalName}» в меню «Война или конфликт» модератором согласовано. Приятного пользования сервисом.`;
        try {
          await this.messenger.sendDirectMessageInWorkspace(
            workspaceId,
            userId,
            row.createdById,
            chatBody,
          );
        } catch {
          /* chat delivery must not block approval */
        }

        if (row.createdById !== userId) {
          await this.notifications.deliver({
            workspaceId,
            userId: row.createdById,
            source: 'MODERATION',
            title: 'Пункт меню одобрен',
            body: `«${finalName}» добавлен в общий список «Война или конфликт».`,
            deepLink: '/military-history',
            sourceId: updated.id,
          });
        }
      }

      return this.mapRow(updated);
    });
  }

  async rejectConflict(userId: string, id: string) {
    await this.requirePlatformAdmin(userId);
    return this.workspaceContext.runBypass(async () => {
      const row = await this.prisma.militaryConflictDefinition.findFirst({
        where: { id, status: 'PENDING' },
      });
      if (!row) throw new NotFoundException('Pending conflict proposal not found');

      const updated = await this.prisma.militaryConflictDefinition.update({
        where: { id: row.id },
        data: {
          status: 'REJECTED',
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      if (row.createdById && row.createdById !== userId) {
        await this.notifications.deliver({
          workspaceId: row.workspaceId,
          userId: row.createdById,
          source: 'MODERATION',
          title: 'Пункт меню отклонён',
          body: `Предложение «${row.name}» не добавлено в «Война или конфликт».`,
          deepLink: '/military-history',
          sourceId: updated.id,
        });
      }

      return this.mapRow(updated);
    });
  }

  async deleteApprovedConflict(userId: string, id: string) {
    await this.requirePlatformAdmin(userId);
    return this.workspaceContext.runBypass(async () => {
      const row = await this.prisma.militaryConflictDefinition.findFirst({
        where: { id, status: 'APPROVED' },
      });
      if (!row) throw new NotFoundException('Approved conflict not found');

      await this.prisma.militaryConflictDefinition.delete({ where: { id: row.id } });
      return { ok: true, id: row.id };
    });
  }

  async cancelMyProposal(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);

    const row = await this.prisma.militaryConflictDefinition.findFirst({
      where: { id, workspaceId, createdById: userId, status: 'PENDING' },
    });
    if (!row) throw new NotFoundException('Pending proposal not found');

    await this.prisma.militaryConflictDefinition.delete({ where: { id: row.id } });
    return { ok: true, id: row.id };
  }
}
