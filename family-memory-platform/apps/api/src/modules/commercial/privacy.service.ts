import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrivacyCenterState, PrivacyRequestSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CommercialAuditService } from './commercial-audit.service';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: CommercialAuditService,
  ) {}

  private mapRequest(r: {
    id: string;
    type: string;
    status: string;
    workspaceId: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): PrivacyRequestSummary {
    return {
      id: r.id,
      type: r.type as PrivacyRequestSummary['type'],
      status: r.status,
      workspaceId: r.workspaceId,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    };
  }

  async getCenter(userId: string): Promise<PrivacyCenterState> {
    const matchProfile = await this.prisma.matchProfile.findUnique({ where: { userId } });
    const requests = await this.prisma.privacyRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      matchProfileOptIn: matchProfile?.isOptedIn ?? false,
      defaultPrivacyLevel: 'FAMILY',
      requests: requests.map((r) => this.mapRequest(r)),
    };
  }

  async createRequest(
    userId: string,
    type: 'EXPORT' | 'DELETE' | 'CONSENT_UPDATE',
    workspaceId?: string,
    payload?: Record<string, unknown>,
  ) {
    const req = await this.prisma.privacyRequest.create({
      data: {
        userId,
        workspaceId,
        type,
        payload: payload as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log({
      userId,
      workspaceId,
      action: `privacy.${type.toLowerCase()}.requested`,
      entityType: 'PrivacyRequest',
      entityId: req.id,
    });

    return this.mapRequest(req);
  }

  async updateConsent(userId: string, matchProfileOptIn: boolean) {
    await this.prisma.matchProfile.upsert({
      where: { userId },
      create: {
        userId,
        isOptedIn: matchProfileOptIn,
        optedInAt: matchProfileOptIn ? new Date() : null,
      },
      update: {
        isOptedIn: matchProfileOptIn,
        optedInAt: matchProfileOptIn ? new Date() : null,
      },
    });

    await this.createRequest(userId, 'CONSENT_UPDATE', undefined, { matchProfileOptIn });
    return this.getCenter(userId);
  }
}
