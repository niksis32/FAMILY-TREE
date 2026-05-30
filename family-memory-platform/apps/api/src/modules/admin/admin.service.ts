import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AdminStatsLastAudit = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  workspaceId: string | null;
  createdAt: string;
};

export type AdminStatsResponse = {
  generatedAt: string;
  personsCount: number;
  mediaCount: number;
  mediaBytes: number;
  lastAudit: AdminStatsLastAudit | null;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStatsResponse> {
    const [personsCount, mediaAggregate, lastAudit] = await Promise.all([
      this.prisma.person.count({ where: { deletedAt: null } }),
      this.prisma.media.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { sizeBytes: true },
      }),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userId: true,
          workspaceId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      personsCount,
      mediaCount: mediaAggregate._count._all,
      mediaBytes: mediaAggregate._sum.sizeBytes ?? 0,
      lastAudit: lastAudit
        ? {
            id: lastAudit.id,
            action: lastAudit.action,
            entityType: lastAudit.entityType,
            entityId: lastAudit.entityId,
            userId: lastAudit.userId,
            workspaceId: lastAudit.workspaceId,
            createdAt: lastAudit.createdAt.toISOString(),
          }
        : null,
    };
  }
}
