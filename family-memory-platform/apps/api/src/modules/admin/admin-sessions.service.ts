import type {
  AdminLoginEventListResponse,
  AdminSessionListResponse,
  AdminSessionStatsResponse,
} from '@family/shared';
import { LoginEventOutcome, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSessionService } from '../auth/auth-session.service';

@Injectable()
export class AdminSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSessions: AuthSessionService,
  ) {}

  async getStats(): Promise<AdminSessionStatsResponse> {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeSessions, uniqueUsers, failedLogins24h, suspicious24h] = await Promise.all([
      this.prisma.userAuthSession.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.userAuthSession.groupBy({
        by: ['userId'],
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.userLoginEvent.count({
        where: {
          createdAt: { gte: since24h },
          outcome: {
            in: [
              LoginEventOutcome.FAILURE_BAD_CREDENTIALS,
              LoginEventOutcome.FAILURE_INACTIVE,
              LoginEventOutcome.FAILURE_MFA,
            ],
          },
        },
      }),
      this.prisma.userLoginEvent.count({
        where: { createdAt: { gte: since24h }, isSuspicious: true },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      activeSessions,
      activeUsers: uniqueUsers.length,
      failedLogins24h,
      suspiciousEvents24h: suspicious24h,
    };
  }

  async listSessions(params: {
    limit?: number;
    offset?: number;
    userId?: string;
    activeOnly?: boolean;
  }): Promise<AdminSessionListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);
    const now = new Date();

    const where: Prisma.UserAuthSessionWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.activeOnly === false
        ? {}
        : { revokedAt: null, expiresAt: { gt: now } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.userAuthSession.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, displayName: true, role: true } },
          revokedBy: { select: { id: true, email: true, displayName: true } },
        },
      }),
      this.prisma.userAuthSession.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        jti: row.jti,
        userId: row.userId,
        userEmail: row.user.email,
        userDisplayName: row.user.displayName,
        userRole: row.user.role,
        deviceLabel: row.deviceLabel,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt.toISOString(),
        lastSeenAt: row.lastSeenAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        isActive: !row.revokedAt && row.expiresAt > now,
        revokedAt: row.revokedAt?.toISOString() ?? null,
        revokedByEmail: row.revokedBy?.email ?? null,
        revokeReason: row.revokeReason,
      })),
    };
  }

  async listLoginEvents(params: {
    limit?: number;
    offset?: number;
    userId?: string;
    suspiciousOnly?: boolean;
  }): Promise<AdminLoginEventListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    const where: Prisma.UserLoginEventWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.suspiciousOnly ? { isSuspicious: true } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.userLoginEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      this.prisma.userLoginEvent.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.user?.email ?? row.emailAttempt,
        userDisplayName: row.user?.displayName ?? null,
        emailAttempt: row.emailAttempt,
        outcome: row.outcome,
        deviceLabel: row.deviceLabel,
        ipAddress: row.ipAddress,
        isSuspicious: row.isSuspicious,
        suspiciousReason: row.suspiciousReason,
        sessionId: row.sessionId,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async revokeSession(sessionId: string, adminId: string, reason?: string) {
    const session = await this.prisma.userAuthSession.findUnique({
      where: { id: sessionId },
      select: { id: true, revokedAt: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.revokedAt) return { revoked: false, alreadyRevoked: true };

    await this.authSessions.revokeSession(sessionId, adminId, reason ?? 'admin_revoke');
    return { revoked: true, alreadyRevoked: false };
  }

  async revokeAllForUser(userId: string, adminId: string, exceptJti?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const count = await this.authSessions.revokeAllForUser(userId, adminId, 'admin_revoke_all', exceptJti);
    return { revokedCount: count };
  }
}
