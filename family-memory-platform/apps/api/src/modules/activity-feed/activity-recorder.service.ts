import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { REALTIME_EVENTS, type ActivityEventType, type RealtimeEnvelope } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimePubSubService } from '../realtime/realtime-pubsub.service';

export type RecordActivityInput = {
  workspaceId: string;
  actorUserId?: string;
  type: ActivityEventType;
  summary: string;
  deepLink?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ActivityRecorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: RealtimePubSubService,
  ) {}

  async record(input: RecordActivityInput) {
    const row = await this.prisma.activityEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        type: input.type,
        summary: input.summary,
        deepLink: input.deepLink,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const actor = input.actorUserId
      ? await this.prisma.user.findUnique({
          where: { id: input.actorUserId },
          select: { displayName: true },
        })
      : null;

    const summary = {
      id: row.id,
      workspaceId: row.workspaceId,
      actorUserId: row.actorUserId,
      actorName: actor?.displayName ?? null,
      type: row.type,
      summary: row.summary,
      deepLink: row.deepLink,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
    };

    const envelope: RealtimeEnvelope = {
      event: REALTIME_EVENTS.ACTIVITY_NEW,
      workspaceId: input.workspaceId,
      payload: summary,
      emittedAt: new Date().toISOString(),
    };
    await this.pubsub.publishWorkspace(input.workspaceId, envelope);
    return summary;
  }
}
