import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { ModerationReportCategory } from '@prisma/client';
import { REALTIME_EVENTS, type ConversationSummary, type MessageSummary, type RealtimeEnvelope } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { ActivityRecorderService } from '../activity-feed/activity-recorder.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimePubSubService } from '../realtime/realtime-pubsub.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WebhookDomainHooksService } from '../webhooks/webhook-domain-hooks.service';

@Injectable()
export class MessengerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workspaces: WorkspacesService,
    private readonly pubsub: RealtimePubSubService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityRecorderService,
    @Optional() private readonly webhookHooks?: WebhookDomainHooksService,
  ) {}

  async listConversations(userId: string) {
    const snapshot = this.workspaceContext.getSnapshot();
    const participations = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
        conversation: snapshot.workspaceId ? { workspaceId: snapshot.workspaceId } : undefined,
      },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { displayName: true } },
                attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
                readReceipts: { where: { userId } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const summaries: ConversationSummary[] = [];
    for (const p of participations) {
      summaries.push(await this.toConversationSummary(p.conversation, userId, p.lastReadAt));
    }
    return summaries;
  }

  async createDirect(userId: string, participantUserId: string) {
    if (userId === participantUserId) {
      throw new BadRequestException('Cannot create direct chat with yourself');
    }
    const workspace = await this.workspaces.ensureDefaultWorkspace(userId);
    await this.workspaces.assertMember(workspace.id, participantUserId);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        type: 'DIRECT',
        participants: { every: { userId: { in: [userId, participantUserId] } } },
      },
      include: { participants: true },
    });
    if (existing && existing.participants.length === 2) {
      return this.getConversation(existing.id, userId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        type: 'DIRECT',
        createdById: userId,
        participants: {
          create: [{ userId }, { userId: participantUserId }],
        },
      },
    });
    return this.getConversation(conversation.id, userId);
  }

  /** Find or create a direct chat in a specific workspace and send a message. */
  async sendDirectMessageInWorkspace(
    workspaceId: string,
    fromUserId: string,
    toUserId: string,
    body: string,
  ) {
    if (fromUserId === toUserId) return null;
    await this.workspaces.assertMember(workspaceId, fromUserId);
    await this.workspaces.assertMember(workspaceId, toUserId);

    const candidates = await this.prisma.conversation.findMany({
      where: {
        workspaceId,
        type: 'DIRECT',
        participants: { some: { userId: fromUserId } },
      },
      include: { participants: true },
    });
    const existing = candidates.find(
      (row) =>
        row.participants.length === 2 &&
        row.participants.some((p) => p.userId === fromUserId) &&
        row.participants.some((p) => p.userId === toUserId),
    );

    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          workspaceId,
          type: 'DIRECT',
          createdById: fromUserId,
          participants: { create: [{ userId: fromUserId }, { userId: toUserId }] },
        },
      }));

    return this.sendMessage(conversation.id, fromUserId, body);
  }

  async createGroup(userId: string, title: string, participantUserIds: string[]) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(userId);
    const uniqueIds = [...new Set([userId, ...participantUserIds])];
    for (const id of uniqueIds) {
      await this.workspaces.assertMember(workspace.id, id);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        type: 'GROUP',
        title,
        createdById: userId,
        participants: { create: uniqueIds.map((uid) => ({ userId: uid })) },
      },
    });
    return this.getConversation(conversation.id, userId);
  }

  async createContext(
    userId: string,
    contextType: 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH',
    contextId: string,
    title?: string,
  ) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(userId);
    const existing = await this.prisma.conversation.findFirst({
      where: { workspaceId: workspace.id, type: 'CONTEXT', contextType, contextId },
    });
    if (existing) return this.getConversation(existing.id, userId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { userId: true },
    });

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        type: 'CONTEXT',
        contextType,
        contextId,
        title: title ?? `${contextType} chat`,
        createdById: userId,
        participants: { create: members.map((m) => ({ userId: m.userId })) },
      },
    });
    return this.getConversation(conversation.id, userId);
  }

  async getConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { displayName: true } },
            attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
            readReceipts: { where: { userId } },
          },
        },
      },
    });
    const participant = conversation.participants.find((p) => p.userId === userId);
    return this.toConversationSummary(conversation, userId, participant?.lastReadAt ?? null);
  }

  async listMessages(conversationId: string, userId: string, cursor?: string) {
    await this.assertParticipant(conversationId, userId);
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: { displayName: true } },
        attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
        readReceipts: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 51,
    });
    const hasMore = rows.length > 50;
    const slice = hasMore ? rows.slice(0, 50) : rows;
    return {
      items: slice.reverse().map((m) => this.toMessageSummary(m, userId)),
      nextCursor: hasMore ? slice[0]?.createdAt.toISOString() ?? null : null,
    };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    body: string,
    attachmentMediaIds?: string[],
  ) {
    await this.assertParticipant(conversationId, userId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { participants: true },
    });

    await this.assertCanSend(userId, conversation.workspaceId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        attachments: attachmentMediaIds?.length
          ? { create: attachmentMediaIds.map((mediaId) => ({ mediaId })) }
          : undefined,
      },
      include: {
        sender: { select: { displayName: true } },
        attachments: { include: { media: { select: { id: true, title: true, mimeType: true } } } },
        readReceipts: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const summary = this.toMessageSummary(message, userId);
    const envelope: RealtimeEnvelope<MessageSummary> = {
      event: REALTIME_EVENTS.MESSAGE_NEW,
      workspaceId: conversation.workspaceId,
      payload: summary,
      emittedAt: new Date().toISOString(),
    };
    await this.pubsub.publishWorkspace(conversation.workspaceId, envelope);

    for (const participant of conversation.participants) {
      if (participant.userId === userId) continue;
      await this.notifications.deliver({
        workspaceId: conversation.workspaceId,
        userId: participant.userId,
        source: 'MESSENGER',
        title: 'Новое сообщение',
        body: body.slice(0, 200),
        deepLink: `/messages?conversation=${conversationId}`,
        sourceId: message.id,
      });
    }

    await this.activity.record({
      workspaceId: conversation.workspaceId,
      actorUserId: userId,
      type: 'MESSAGE_SENT',
      summary: 'Отправлено сообщение в семейном чате',
      deepLink: `/messages?conversation=${conversationId}`,
      entityType: 'conversation',
      entityId: conversationId,
    });

    void this.webhookHooks?.onMessageCreated({
      workspaceId: conversation.workspaceId,
      conversationId,
      messageId: message.id,
      senderId: userId,
      bodyPreview: body.slice(0, 200),
    });

    return summary;
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const now = new Date();
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    });

    const unread = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
        readReceipts: { none: { userId } },
      },
      select: { id: true },
    });

    if (unread.length) {
      await this.prisma.messageReadReceipt.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });
    }

    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    const envelope: RealtimeEnvelope = {
      event: REALTIME_EVENTS.MESSAGE_READ,
      workspaceId: conversation.workspaceId,
      payload: { conversationId, userId, readAt: now.toISOString() },
      emittedAt: now.toISOString(),
    };
    await this.pubsub.publishWorkspace(conversation.workspaceId, envelope);
    return { ok: true, readAt: now.toISOString() };
  }

  async reportMessage(
    messageId: string,
    reporterId: string,
    category: ModerationReportCategory,
    details?: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
      include: { conversation: { select: { id: true } } },
    });
    if (!message) throw new BadRequestException('Message not found');

    await this.assertParticipant(message.conversationId, reporterId);

    return this.prisma.moderationReport.create({
      data: {
        reporterId,
        targetType: 'MESSAGE',
        targetId: messageId,
        category,
        details,
      },
    });
  }

  private async assertCanSend(userId: string, workspaceId: string) {
    const now = new Date();
    const sanction = await this.prisma.messengerSanction.findFirst({
      where: {
        userId,
        revokedAt: null,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ workspaceId: null }, { workspaceId }] },
        ],
      },
    });

    if (sanction) {
      throw new ForbiddenException('Sending messages is temporarily blocked for this account');
    }
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant of this conversation');
    return participant;
  }

  private async toConversationSummary(
    conversation: {
      id: string;
      workspaceId: string;
      type: 'DIRECT' | 'GROUP' | 'CONTEXT';
      title: string | null;
      contextType: 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH' | null;
      contextId: string | null;
      updatedAt: Date;
      createdAt: Date;
      participants: Array<{
        userId: string;
        lastReadAt: Date | null;
        user: { id: string; email: string; displayName: string | null };
      }>;
      messages: Array<{
        id: string;
        conversationId: string;
        senderId: string;
        body: string;
        createdAt: Date;
        sender: { displayName: string | null };
        attachments: Array<{ id: string; mediaId: string; media: { title: string | null; mimeType: string } }>;
        readReceipts: Array<{ userId: string }>;
      }>;
    },
    userId: string,
    lastReadAt: Date | null,
  ): Promise<ConversationSummary> {
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        deletedAt: null,
        createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
      },
    });

    const last = conversation.messages[0];
    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      type: conversation.type,
      title: conversation.title,
      contextType: conversation.contextType,
      contextId: conversation.contextId,
      unreadCount,
      lastMessage: last ? this.toMessageSummary(last, userId) : null,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        displayName: p.user.displayName,
        email: p.user.email,
        lastReadAt: p.lastReadAt?.toISOString() ?? null,
      })),
      updatedAt: conversation.updatedAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  private toMessageSummary(
    message: {
      id: string;
      conversationId: string;
      senderId: string;
      body: string;
      createdAt: Date;
      sender: { displayName: string | null };
      attachments: Array<{ id: string; mediaId: string; media: { title: string | null; mimeType: string } }>;
      readReceipts: Array<{ userId: string }>;
    },
    userId: string,
  ): MessageSummary {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.displayName,
      body: message.body,
      attachments: message.attachments.map((a) => ({
        id: a.id,
        mediaId: a.mediaId,
        fileName: a.media.title,
        mimeType: a.media.mimeType,
      })),
      createdAt: message.createdAt.toISOString(),
      readByMe: message.senderId === userId || message.readReceipts.some((r) => r.userId === userId),
    };
  }
}
