import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditLogEntry } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommercialAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    workspaceId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    ipHash?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as Prisma.InputJsonValue | undefined,
        ipHash: input.ipHash,
      },
    });
  }

  async listForWorkspace(workspaceId: string, limit = 50): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      userId: r.userId,
      workspaceId: r.workspaceId,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
