import { Injectable } from '@nestjs/common';
import type { ActivityEventType } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityRecorderService } from '../activity-feed/activity-recorder.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class CollaborationHooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityRecorderService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async onMatchRunCompleted(
    workspaceId: string,
    userId: string,
    runId: string,
    candidatesFound: number,
  ) {
    if (candidatesFound <= 0) return;

    await this.notifications.deliver({
      workspaceId,
      userId,
      source: 'MATCH',
      title: 'Новые совпадения в древе',
      body: `Найдено кандидатов: ${candidatesFound}. Откройте раздел «Совпадения».`,
      deepLink: '/matching',
      sourceId: runId,
    });

    await this.activity.record({
      workspaceId,
      actorUserId: userId,
      type: 'MATCH_FOUND',
      summary: `Найдено ${candidatesFound} совпадений при сканировании древа`,
      deepLink: '/matching',
      entityType: 'treeMatchRun',
      entityId: runId,
    });
  }

  async onInviteCreated(workspaceId: string, inviterId: string, email: string, inviteId: string) {
    const invitee = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (invitee) {
      await this.notifications.deliver({
        workspaceId,
        userId: invitee.id,
        source: 'INVITE',
        title: 'Приглашение в workspace',
        body: 'Вас пригласили в семейный workspace. Примите приглашение в настройках.',
        deepLink: '/settings',
        sourceId: inviteId,
      });
    }

    await this.activity.record({
      workspaceId,
      actorUserId: inviterId,
      type: 'INVITE_SENT',
      summary: `Отправлено приглашение: ${email}`,
      deepLink: '/settings',
      entityType: 'workspaceInvite',
      entityId: inviteId,
    });
  }

  async onInviteAccepted(workspaceId: string, userId: string, inviteId: string) {
    const owners = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, role: 'OWNER' },
      select: { userId: true },
    });

    const accepter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true },
    });
    const label = accepter?.displayName ?? accepter?.email ?? 'Участник';

    for (const owner of owners) {
      if (owner.userId === userId) continue;
      await this.notifications.deliver({
        workspaceId,
        userId: owner.userId,
        source: 'INVITE',
        title: 'Приглашение принято',
        body: `${label} присоединился к workspace.`,
        deepLink: '/settings',
        sourceId: inviteId,
      });
    }
  }

  async onModerationPostApproved(authorId: string, postId: string) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(authorId);
    await this.notifications.deliver({
      workspaceId: workspace.id,
      userId: authorId,
      source: 'MODERATION',
      title: 'Публикация одобрена',
      body: 'Ваша публикация в сообществе прошла модерацию.',
      deepLink: '/community',
      sourceId: postId,
    });
  }

  async onModerationPostHidden(authorId: string, postId: string, reason?: string) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(authorId);
    await this.notifications.deliver({
      workspaceId: workspace.id,
      userId: authorId,
      source: 'MODERATION',
      title: 'Публикация скрыта модератором',
      body: reason ?? 'Контент скрыт после проверки модерации.',
      deepLink: '/community',
      sourceId: postId,
    });
  }

  async onModerationReportResolved(reporterId: string, reportId: string) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(reporterId);
    await this.notifications.deliver({
      workspaceId: workspace.id,
      userId: reporterId,
      source: 'MODERATION',
      title: 'Жалоба рассмотрена',
      body: 'Ваша жалоба обработана модератором.',
      deepLink: '/community',
      sourceId: reportId,
    });
  }

  async onMediaUploaded(params: {
    workspaceId: string;
    actorUserId: string;
    mediaId: string;
    title: string;
  }) {
    await this.notifyWorkspaceActivity({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      title: 'Новое медиа в архиве',
      body: '{actor} загрузил(а) медиа: {label}',
      label: params.title,
      deepLink: `/media?highlight=${params.mediaId}`,
      sourceId: params.mediaId,
      activityType: 'MEDIA_UPLOADED',
      activitySummary: `Загружено медиа: ${params.title}`,
      entityType: 'media',
      entityId: params.mediaId,
    });
  }

  async onDocumentUploaded(params: {
    workspaceId: string;
    actorUserId: string;
    documentId: string;
    title: string;
  }) {
    await this.notifyWorkspaceActivity({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      title: 'Новый документ в архиве',
      body: '{actor} добавил(а) документ: {label}',
      label: params.title,
      deepLink: `/documents?highlight=${params.documentId}`,
      sourceId: params.documentId,
      activityType: 'DOCUMENT_UPLOADED',
      activitySummary: `Добавлен документ: ${params.title}`,
      entityType: 'document',
      entityId: params.documentId,
    });
  }

  async onStoryPublished(params: {
    workspaceId: string;
    actorUserId: string;
    storyId: string;
    title: string;
  }) {
    await this.notifyWorkspaceActivity({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      title: 'Опубликована семейная история',
      body: '{actor} опубликовал(а) историю: {label}',
      label: params.title,
      deepLink: `/stories/${params.storyId}`,
      sourceId: params.storyId,
      activityType: 'STORY_PUBLISHED',
      activitySummary: `Опубликована история: ${params.title}`,
      entityType: 'family_story',
      entityId: params.storyId,
    });
  }

  private async notifyWorkspaceActivity(params: {
    workspaceId: string;
    actorUserId: string;
    title: string;
    body: string;
    label: string;
    deepLink: string;
    sourceId: string;
    activityType: ActivityEventType;
    activitySummary: string;
    entityType: string;
    entityId: string;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { id: params.actorUserId },
      select: { displayName: true, email: true },
    });
    const actorLabel = actor?.displayName ?? actor?.email ?? 'Участник';
    const notificationBody = params.body
      .replace('{actor}', actorLabel)
      .replace('{label}', params.label);

    await this.activity.record({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      type: params.activityType,
      summary: params.activitySummary,
      deepLink: params.deepLink,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: params.workspaceId },
      select: { userId: true },
    });

    for (const member of members) {
      if (member.userId === params.actorUserId) continue;
      await this.notifications.deliver({
        workspaceId: params.workspaceId,
        userId: member.userId,
        source: 'ACTIVITY',
        title: params.title,
        body: notificationBody,
        deepLink: params.deepLink,
        sourceId: params.sourceId,
      });
    }
  }
}
