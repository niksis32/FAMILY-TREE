import { Injectable, NotFoundException } from '@nestjs/common';
import { REALTIME_EVENTS, type NotificationPreferenceSummary, type NotificationSource, type NotificationSummary, type RealtimeEnvelope } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { MILITARY_CONFLICT_MODERATION_INBOX_TITLE } from '@family/shared';
import { RealtimePubSubService } from '../realtime/realtime-pubsub.service';

const ALL_SOURCES: NotificationSource[] = [
  'MESSENGER',
  'MATCH',
  'MODERATION',
  'INVITE',
  'CALENDAR',
  'ACTIVITY',
  'SYSTEM',
];

export type CreateNotificationInput = {
  workspaceId: string;
  userId: string;
  source: NotificationSource;
  title: string;
  body: string;
  deepLink?: string;
  sourceId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly pubsub: RealtimePubSubService,
  ) {}

  async listForUser(userId: string, unreadOnly = false) {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.toSummary(row));
  }

  async unreadCount(userId: string) {
    const base = { userId, readAt: null };
    const [total, moderation] = await Promise.all([
      this.prisma.notification.count({ where: base }),
      this.prisma.notification.count({
        where: {
          ...base,
          source: 'MODERATION',
          title: MILITARY_CONFLICT_MODERATION_INBOX_TITLE,
        },
      }),
    ]);
    return { total, moderation };
  }

  async markRead(userId: string, notificationId: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.toSummary(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async getPreferences(userId: string, workspaceId?: string): Promise<NotificationPreferenceSummary[]> {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        OR: [{ workspaceId: workspaceId ?? null }, { workspaceId: null }],
      },
    });
    const map = new Map(prefs.map((p) => [`${p.workspaceId ?? 'global'}:${p.source}`, p.enabled]));
    return ALL_SOURCES.map((source) => ({
      source,
      enabled: map.get(`${workspaceId ?? 'global'}:${source}`) ?? map.get(`global:${source}`) ?? true,
    }));
  }

  async updatePreference(userId: string, source: NotificationSource, enabled: boolean, workspaceId?: string) {
    const scopedWorkspaceId = workspaceId ?? null;
    const existing = await this.prisma.notificationPreference.findFirst({
      where: { userId, workspaceId: scopedWorkspaceId, source },
    });
    if (existing) {
      await this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data: { enabled },
      });
    } else {
      await this.prisma.notificationPreference.create({
        data: { userId, workspaceId: scopedWorkspaceId, source, enabled },
      });
    }
    return this.getPreferences(userId, workspaceId);
  }

  async deliver(input: CreateNotificationInput) {
    const enabled = await this.isEnabled(input.userId, input.source, input.workspaceId);
    if (!enabled) return null;

    const row = await this.prisma.notification.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        source: input.source,
        title: input.title,
        body: input.body,
        deepLink: input.deepLink,
        sourceId: input.sourceId,
      },
    });

    const summary = this.toSummary(row);
    const envelope: RealtimeEnvelope<NotificationSummary> = {
      event: REALTIME_EVENTS.NOTIFICATION_NEW,
      workspaceId: input.workspaceId,
      payload: summary,
      emittedAt: new Date().toISOString(),
    };
    await this.pubsub.publishUser(input.userId, envelope);
    return summary;
  }

  private async isEnabled(userId: string, source: NotificationSource, workspaceId: string) {
    const scoped = await this.prisma.notificationPreference.findFirst({
      where: { userId, workspaceId, source },
    });
    if (scoped) return scoped.enabled;

    const global = await this.prisma.notificationPreference.findFirst({
      where: { userId, workspaceId: null, source },
    });
    return global?.enabled ?? true;
  }

  private toSummary(row: {
    id: string;
    userId: string;
    workspaceId: string;
    source: NotificationSource;
    title: string;
    body: string;
    deepLink: string | null;
    sourceId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationSummary {
    return {
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      source: row.source,
      title: row.title,
      body: row.body,
      deepLink: row.deepLink,
      sourceId: row.sourceId,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
