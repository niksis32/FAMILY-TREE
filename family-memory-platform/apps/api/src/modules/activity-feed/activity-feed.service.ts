import { Injectable } from '@nestjs/common';
import type { ActivityEventType } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';

@Injectable()
export class ActivityFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  async list(options: { type?: ActivityEventType; cursor?: string; limit?: number }) {
    const snapshot = this.workspaceContext.getSnapshot();
    const limit = Math.min(options.limit ?? 30, 100);
    const rows = await this.prisma.activityEvent.findMany({
      where: {
        ...(snapshot.workspaceId ? { workspaceId: snapshot.workspaceId } : {}),
        ...(options.type ? { type: options.type } : {}),
        ...(options.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
      },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      actorUserId: row.actorUserId,
      actorName: row.actor?.displayName ?? null,
      type: row.type,
      summary: row.summary,
      deepLink: row.deepLink,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt ?? null : null,
    };
  }
}
