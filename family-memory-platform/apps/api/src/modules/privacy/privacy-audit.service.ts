import { Injectable } from '@nestjs/common';
import type { AccessLogAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashClientIp } from './privacy-tokens';

@Injectable()
export class PrivacyAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAudit(params: {
    userId?: string;
    workspaceId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    ip?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload as Prisma.InputJsonValue | undefined,
        ipHash: params.ip ? hashClientIp(params.ip) : undefined,
      },
    });
  }

  async logAccess(params: {
    workspaceId?: string;
    userId?: string;
    publicShareId?: string;
    resourceType: string;
    resourceId?: string;
    action: AccessLogAction;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.accessLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        publicShareId: params.publicShareId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        action: params.action,
        ipHash: params.ip ? hashClientIp(params.ip) : undefined,
        userAgent: params.userAgent,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listAccessLogs(workspaceId: string, limit = 100) {
    return this.prisma.accessLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async listUserAccessLogs(userId: string, limit = 50) {
    return this.prisma.accessLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
