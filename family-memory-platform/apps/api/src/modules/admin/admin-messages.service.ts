import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminMessageExportResponse,
  AdminMessageReportListResponse,
  AdminMessengerConversationDetail,
  AdminMessengerConversationListResponse,
  AdminMessengerMessageListResponse,
  AdminMessengerSanctionListResponse,
  AdminMessengerStatsResponse,
} from '@family/shared';
import {
  ModerationActionType,
  ModerationReportStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminApplyMessengerSanctionDto,
  AdminHideMessageDto,
  AdminResolveMessageReportDto,
} from './admin.dto';

@Injectable()
export class AdminMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminMessengerStatsResponse> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [conversations, messages24h, openReports, activeSanctions] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.message.count({ where: { createdAt: { gte: since24h }, deletedAt: null } }),
      this.prisma.moderationReport.count({
        where: { targetType: 'MESSAGE', status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      this.prisma.messengerSanction.count({
        where: {
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      totalConversations: conversations,
      messages24h,
      openMessageReports: openReports,
      activeSanctions,
    };
  }

  async searchConversations(params: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminMessengerConversationListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);
    const q = params.q?.trim();

    const where: Prisma.ConversationWhereInput = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            {
              participants: {
                some: {
                  user: {
                    OR: [
                      { email: { contains: q, mode: 'insensitive' } },
                      { displayName: { contains: q, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
            {
              workspace: { name: { contains: q, mode: 'insensitive' } },
            },
            {
              messages: {
                some: {
                  deletedAt: null,
                  body: { contains: q, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          workspace: { select: { id: true, name: true } },
          participants: {
            include: { user: { select: { id: true, email: true, displayName: true } } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, createdAt: true },
          },
          _count: { select: { messages: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspaceId,
        workspaceName: row.workspace.name,
        type: row.type,
        title: row.title,
        contextType: row.contextType,
        contextId: row.contextId,
        participantCount: row.participants.length,
        participants: row.participants.map((p) => ({
          userId: p.userId,
          email: p.user.email,
          displayName: p.user.displayName,
        })),
        messageCount: row._count.messages,
        lastMessagePreview: row.messages[0]?.body.slice(0, 120) ?? null,
        lastMessageAt: row.messages[0]?.createdAt.toISOString() ?? row.updatedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async getConversation(conversationId: string): Promise<AdminMessengerConversationDetail> {
    const row = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        workspace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, displayName: true } },
        participants: {
          include: { user: { select: { id: true, email: true, displayName: true, role: true } } },
        },
        _count: { select: { messages: true } },
      },
    });
    if (!row) throw new NotFoundException('Conversation not found');

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      workspaceName: row.workspace.name,
      type: row.type,
      title: row.title,
      contextType: row.contextType,
      contextId: row.contextId,
      createdBy: row.createdBy,
      participantCount: row.participants.length,
      participants: row.participants.map((p) => ({
        userId: p.userId,
        email: p.user.email,
        displayName: p.user.displayName,
        platformRole: p.user.role,
        joinedAt: p.joinedAt.toISOString(),
        lastReadAt: p.lastReadAt?.toISOString() ?? null,
      })),
      messageCount: row._count.messages,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listMessages(
    conversationId: string,
    params: { limit?: number; offset?: number; includeDeleted?: boolean },
  ): Promise<AdminMessengerMessageListResponse> {
    await this.getConversation(conversationId);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(params.includeDeleted ? {} : { deletedAt: null }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
        include: {
          sender: { select: { id: true, email: true, displayName: true } },
          attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderEmail: m.sender.email,
        senderName: m.sender.displayName,
        body: m.body,
        isHidden: m.deletedAt !== null,
        hiddenAt: m.deletedAt?.toISOString() ?? null,
        attachmentCount: m.attachments.length,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async exportConversation(conversationId: string): Promise<AdminMessageExportResponse> {
    const detail = await this.getConversation(conversationId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true, displayName: true } },
        attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      conversation: detail,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderEmail: m.sender.email,
        senderName: m.sender.displayName,
        body: m.body,
        isHidden: m.deletedAt !== null,
        hiddenAt: m.deletedAt?.toISOString() ?? null,
        attachments: m.attachments.map((a) => ({
          mediaId: a.mediaId,
          fileName: a.media.title,
          mimeType: a.media.mimeType,
        })),
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async listMessageReports(params: {
    limit?: number;
    offset?: number;
    status?: 'OPEN' | 'UNDER_REVIEW' | 'ALL';
  }): Promise<AdminMessageReportListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    const where: Prisma.ModerationReportWhereInput = {
      targetType: 'MESSAGE',
      ...(params.status && params.status !== 'ALL'
        ? { status: params.status }
        : params.status === 'ALL'
          ? {}
          : { status: { in: ['OPEN', 'UNDER_REVIEW'] } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.moderationReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { reporter: { select: { id: true, email: true, displayName: true } } },
      }),
      this.prisma.moderationReport.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (report) => {
        const message = await this.prisma.message.findUnique({
          where: { id: report.targetId },
          include: {
            sender: { select: { id: true, email: true, displayName: true } },
            conversation: {
              select: {
                id: true,
                title: true,
                type: true,
                workspace: { select: { name: true } },
              },
            },
          },
        });

        return {
          id: report.id,
          category: report.category,
          details: report.details,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          reporter: report.reporter,
          message: message
            ? {
                id: message.id,
                conversationId: message.conversationId,
                bodyPreview: message.body.slice(0, 300),
                isHidden: message.deletedAt !== null,
                sender: message.sender,
                conversationTitle: message.conversation.title,
                conversationType: message.conversation.type,
                workspaceName: message.conversation.workspace.name,
              }
            : null,
        };
      }),
    );

    return { total, limit, offset, items };
  }

  async resolveReport(reportId: string, adminId: string, dto: AdminResolveMessageReportDto) {
    const report = await this.prisma.moderationReport.findFirst({
      where: { id: reportId, targetType: 'MESSAGE' },
    });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.moderationReport.update({
      where: { id: reportId },
      data: { status: dto.status },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId: adminId,
        targetType: 'MESSAGE',
        targetId: report.targetId,
        actionType:
          dto.status === ModerationReportStatus.RESOLVED
            ? ModerationActionType.HIDE_CONTENT
            : ModerationActionType.RESTORE,
        reason: dto.moderatorNote,
      },
    });

    if (dto.hideMessage && dto.status === ModerationReportStatus.RESOLVED) {
      await this.hideMessage(report.targetId, adminId, dto.moderatorNote ?? 'Resolved from report');
    }

    if (dto.applySendBlock && dto.status === ModerationReportStatus.RESOLVED) {
      const message = await this.prisma.message.findUnique({
        where: { id: report.targetId },
        select: { senderId: true, conversation: { select: { workspaceId: true } } },
      });
      if (message) {
        await this.applySanction(adminId, {
          userId: message.senderId,
          workspaceId: dto.blockScope === 'WORKSPACE' ? message.conversation.workspaceId : undefined,
          reason: dto.moderatorNote ?? 'Messenger send block from report',
          expiresAt: dto.blockExpiresAt,
        });
      }
    }

    return { ok: true };
  }

  async hideMessage(messageId: string, adminId: string, reason?: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.deletedAt) return { hidden: false, alreadyHidden: true };

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId: adminId,
        targetType: 'MESSAGE',
        targetId: messageId,
        actionType: ModerationActionType.HIDE_CONTENT,
        reason: reason ?? 'Admin moderation',
      },
    });

    return { hidden: true, alreadyHidden: false };
  }

  async listSanctions(params: { limit?: number; offset?: number; activeOnly?: boolean }) {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);
    const now = new Date();

    const where: Prisma.MessengerSanctionWhereInput = params.activeOnly === false
      ? {}
      : {
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };

    const [rows, total] = await Promise.all([
      this.prisma.messengerSanction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          createdBy: { select: { id: true, email: true, displayName: true } },
          workspace: { select: { id: true, name: true } },
        },
      }),
      this.prisma.messengerSanction.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.user.email,
        userDisplayName: row.user.displayName,
        workspaceId: row.workspaceId,
        workspaceName: row.workspace?.name ?? null,
        type: row.type,
        reason: row.reason,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        isActive: !row.revokedAt && (!row.expiresAt || row.expiresAt > now),
        revokedAt: row.revokedAt?.toISOString() ?? null,
        createdByEmail: row.createdBy.email,
        createdAt: row.createdAt.toISOString(),
      })),
    } satisfies AdminMessengerSanctionListResponse;
  }

  async applySanction(adminId: string, dto: AdminApplyMessengerSanctionDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.workspaceId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: dto.workspaceId },
        select: { id: true },
      });
      if (!workspace) throw new BadRequestException('Workspace not found');
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt');
    }

    const row = await this.prisma.messengerSanction.create({
      data: {
        userId: dto.userId,
        workspaceId: dto.workspaceId,
        reason: dto.reason,
        expiresAt,
        createdById: adminId,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId: adminId,
        targetType: 'USER',
        targetId: dto.userId,
        actionType: expiresAt ? ModerationActionType.BAN_USER_TEMP : ModerationActionType.BAN_USER_PERM,
        reason: dto.reason,
        metadata: { scope: dto.workspaceId ? 'workspace' : 'platform', messenger: true },
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      workspaceId: row.workspaceId,
      workspaceName: row.workspace?.name ?? null,
      reason: row.reason,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async revokeSanction(sanctionId: string, adminId: string) {
    const sanction = await this.prisma.messengerSanction.findUnique({ where: { id: sanctionId } });
    if (!sanction) throw new NotFoundException('Sanction not found');
    if (sanction.revokedAt) return { revoked: false, alreadyRevoked: true };

    await this.prisma.messengerSanction.update({
      where: { id: sanctionId },
      data: { revokedAt: new Date() },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId: adminId,
        targetType: 'USER',
        targetId: sanction.userId,
        actionType: ModerationActionType.RESTORE,
        reason: 'Messenger send block revoked',
      },
    });

    return { revoked: true, alreadyRevoked: false };
  }
}
