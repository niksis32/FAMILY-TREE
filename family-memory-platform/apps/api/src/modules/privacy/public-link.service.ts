import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicShareResourceType } from '@prisma/client';
import type { PublicShareCreateResult, PublicShareSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivacyAuditService } from './privacy-audit.service';
import { generatePublicShareToken, hashPublicShareToken } from './privacy-tokens';
import { AccessControlService } from './access-control.service';

@Injectable()
export class PublicLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PrivacyAuditService,
    private readonly access: AccessControlService,
  ) {}

  async listForUser(userId: string): Promise<PublicShareSummary[]> {
    const rows = await this.prisma.publicShare.findMany({
      where: { createdById: userId, tokenRevokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.mapSummary(r));
  }

  async create(params: {
    userId: string;
    workspaceId?: string;
    resourceType: PublicShareResourceType;
    resourceId: string;
    label?: string;
    hideLivingPersons?: boolean;
    expiresAt?: Date;
    familyStoryId?: string;
  }): Promise<PublicShareCreateResult> {
    const { raw, hash } = generatePublicShareToken();
    const share = await this.prisma.publicShare.create({
      data: {
        createdById: params.userId,
        workspaceId: params.workspaceId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        familyStoryId: params.familyStoryId,
        label: params.label,
        hideLivingPersons: params.hideLivingPersons ?? true,
        publicTokenHash: hash,
        expiresAt: params.expiresAt,
      },
    });

    await this.audit.logAudit({
      userId: params.userId,
      workspaceId: params.workspaceId,
      action: 'privacy.public_link.created',
      entityType: 'PublicShare',
      entityId: share.id,
      payload: { resourceType: params.resourceType, resourceId: params.resourceId },
    });

    return {
      ...this.mapSummary(share),
      publicToken: raw,
      publicUrl: `/public/share/${raw}`,
    };
  }

  async revoke(userId: string, shareId: string) {
    const share = await this.prisma.publicShare.findFirst({ where: { id: shareId, createdById: userId } });
    if (!share) throw new NotFoundException('Public share not found');
    await this.prisma.publicShare.update({
      where: { id: shareId },
      data: { tokenRevokedAt: new Date() },
    });
    await this.audit.logAudit({
      userId,
      action: 'privacy.public_link.revoked',
      entityType: 'PublicShare',
      entityId: shareId,
    });
    return { ok: true };
  }

  async resolveByToken(token: string, ip?: string, userAgent?: string) {
    const hash = hashPublicShareToken(token);
    const share = await this.prisma.publicShare.findFirst({
      where: { publicTokenHash: hash, tokenRevokedAt: null },
    });

    if (!share) throw new NotFoundException('Link not found or revoked');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException('Link expired');
    }

    await this.prisma.publicShare.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    await this.audit.logAccess({
      workspaceId: share.workspaceId ?? undefined,
      publicShareId: share.id,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      action: 'PUBLIC_LINK_OPEN',
      ip,
      userAgent,
    });

    const viewer = this.access.viewerFromUser(null, true);

    if (share.resourceType === 'PERSON') {
      const person = await this.access.loadPersonPolicy(share.resourceId);
      if (!person) throw new NotFoundException('Person not found');
      const redacted = this.access.redactPerson(person, viewer, share.hideLivingPersons);
      return { share: this.mapSummary(share), payload: { type: 'PERSON', person: redacted } };
    }

    if (share.resourceType === 'FAMILY_TREE') {
      return {
        share: this.mapSummary(share),
        payload: {
          type: 'FAMILY_TREE',
          familyId: share.resourceId,
          hideLivingPersons: share.hideLivingPersons,
        },
      };
    }

    if (share.resourceType === 'FAMILY_STORY' && share.familyStoryId) {
      return {
        share: this.mapSummary(share),
        payload: { type: 'FAMILY_STORY', storyId: share.familyStoryId },
      };
    }

    return { share: this.mapSummary(share), payload: { type: share.resourceType, resourceId: share.resourceId } };
  }

  private mapSummary(share: {
    id: string;
    resourceType: string;
    resourceId: string;
    label: string | null;
    hideLivingPersons: boolean;
    viewCount: number;
    tokenRevokedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): PublicShareSummary {
    return {
      id: share.id,
      resourceType: share.resourceType as PublicShareSummary['resourceType'],
      resourceId: share.resourceId,
      label: share.label,
      hideLivingPersons: share.hideLivingPersons,
      viewCount: share.viewCount,
      tokenRevokedAt: share.tokenRevokedAt?.toISOString() ?? null,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
    };
  }
}
