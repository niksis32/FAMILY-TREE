import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginEventOutcome } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { extractAuthRequestMeta, parseDeviceLabel, type AuthRequestMeta } from './auth-request.util';

const SUSPICIOUS_WINDOW_MS = 15 * 60 * 1000;
const SUSPICIOUS_FAILURE_THRESHOLD = 5;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthSessionService {
  private readonly lastTouch = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  resolveExpiresAt(): Date {
    const raw = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(raw.trim());
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(Date.now() + amount * (multipliers[unit] ?? 86_400_000));
  }

  async createSession(userId: string, meta: AuthRequestMeta = {}) {
    const jti = randomUUID();
    const expiresAt = this.resolveExpiresAt();
    const deviceLabel = parseDeviceLabel(meta.userAgent);

    const session = await this.prisma.userAuthSession.create({
      data: {
        userId,
        jti,
        deviceLabel,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    await this.recordLoginEvent({
      userId,
      emailAttempt: undefined,
      outcome: LoginEventOutcome.SUCCESS,
      meta,
      sessionId: session.id,
    });

    return { jti, sessionId: session.id, expiresAt };
  }

  async recordLoginEvent(params: {
    userId?: string;
    emailAttempt?: string;
    outcome: LoginEventOutcome;
    meta?: AuthRequestMeta;
    sessionId?: string;
  }) {
    const meta = params.meta ?? {};
    const deviceLabel = parseDeviceLabel(meta.userAgent);
    const suspicious = await this.detectSuspicious(params.outcome, params.emailAttempt, meta.ipAddress);

    return this.prisma.userLoginEvent.create({
      data: {
        userId: params.userId,
        emailAttempt: params.emailAttempt?.toLowerCase(),
        outcome: params.outcome,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        deviceLabel,
        sessionId: params.sessionId,
        isSuspicious: suspicious.isSuspicious,
        suspiciousReason: suspicious.reason,
      },
    });
  }

  async assertSessionActive(jti: string) {
    const session = await this.prisma.userAuthSession.findUnique({
      where: { jti },
      select: { id: true, revokedAt: true, expiresAt: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return session;
  }

  async touchSession(jti: string) {
    const now = Date.now();
    const last = this.lastTouch.get(jti) ?? 0;
    if (now - last < SESSION_TOUCH_INTERVAL_MS) return;
    this.lastTouch.set(jti, now);

    await this.prisma.userAuthSession.updateMany({
      where: { jti, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeSession(sessionId: string, revokedById?: string, reason?: string) {
    const session = await this.prisma.userAuthSession.findUnique({
      where: { id: sessionId },
      select: { id: true, revokedAt: true },
    });
    if (!session || session.revokedAt) return null;

    return this.prisma.userAuthSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedById,
        revokeReason: reason ?? 'admin_revoke',
      },
    });
  }

  async revokeAllForUser(userId: string, revokedById?: string, reason?: string, exceptJti?: string) {
    const sessions = await this.prisma.userAuthSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(exceptJti ? { NOT: { jti: exceptJti } } : {}),
      },
      select: { id: true },
    });

    if (!sessions.length) return 0;

    await this.prisma.userAuthSession.updateMany({
      where: { id: { in: sessions.map((s) => s.id) } },
      data: {
        revokedAt: new Date(),
        revokedById,
        revokeReason: reason ?? 'admin_revoke_all',
      },
    });

    return sessions.length;
  }

  private async detectSuspicious(outcome: LoginEventOutcome, emailAttempt?: string, ipAddress?: string) {
    if (
      outcome !== LoginEventOutcome.FAILURE_BAD_CREDENTIALS &&
      outcome !== LoginEventOutcome.FAILURE_MFA
    ) {
      return { isSuspicious: false, reason: null as string | null };
    }

    const since = new Date(Date.now() - SUSPICIOUS_WINDOW_MS);
    const where = {
      createdAt: { gte: since },
      outcome: { in: [LoginEventOutcome.FAILURE_BAD_CREDENTIALS, LoginEventOutcome.FAILURE_MFA] as LoginEventOutcome[] },
      ...(ipAddress ? { ipAddress } : {}),
    };

    const failures = await this.prisma.userLoginEvent.count({ where });
    if (failures + 1 >= SUSPICIOUS_FAILURE_THRESHOLD) {
      return {
        isSuspicious: true,
        reason: ipAddress
          ? `More than ${SUSPICIOUS_FAILURE_THRESHOLD} failed attempts from IP ${ipAddress} in 15 minutes`
          : `More than ${SUSPICIOUS_FAILURE_THRESHOLD} failed attempts in 15 minutes`,
      };
    }

    if (emailAttempt) {
      const emailFailures = await this.prisma.userLoginEvent.count({
        where: {
          emailAttempt: emailAttempt.toLowerCase(),
          createdAt: { gte: since },
          outcome: { in: [LoginEventOutcome.FAILURE_BAD_CREDENTIALS, LoginEventOutcome.FAILURE_MFA] },
        },
      });
      if (emailFailures + 1 >= 3) {
        return {
          isSuspicious: true,
          reason: `Repeated failed login attempts for ${emailAttempt}`,
        };
      }
    }

    return { isSuspicious: false, reason: null as string | null };
  }
}

export { extractAuthRequestMeta, parseDeviceLabel };
