import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicShareResourceType } from '@prisma/client';
import type { PublicShareCreateResult, PublicShareStatus, PublicShareSummary } from '@family/shared';
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
      where: { createdById: userId },
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
    expiresAt?: Date | null;
    familyStoryId?: string;
  }): Promise<PublicShareCreateResult> {
    const expiresAt = this.resolveExpiresAt(params.expiresAt);
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
        expiresAt,
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
    if (share.tokenRevokedAt) throw new BadRequestException('Public share already revoked');
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
      const tree = await this.buildPublicFamilyTree(share.resourceId, share.hideLivingPersons);
      return {
        share: this.mapSummary(share),
        payload: { type: 'FAMILY_TREE', familyId: share.resourceId, hideLivingPersons: share.hideLivingPersons, tree },
      };
    }

    if (share.resourceType === 'MEDIA_BUNDLE') {
      const workspaceId = share.workspaceId ?? share.resourceId;
      const media = await this.prisma.media.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          title: true,
          mimeType: true,
          privacyLevel: true,
          personId: true,
        },
      });
      const viewer = this.access.viewerFromUser(null, true);
      const visible = [];
      for (const item of media) {
        const person = item.personId ? await this.access.loadPersonPolicy(item.personId) : null;
        if (this.access.canViewMediaRecord({ id: item.id, privacyLevel: item.privacyLevel, personId: item.personId }, viewer, person)) {
          visible.push({ id: item.id, fileName: item.title ?? item.id, mimeType: item.mimeType });
        }
      }
      return {
        share: this.mapSummary(share),
        payload: { type: 'MEDIA_BUNDLE', workspaceId, items: visible },
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

  private async buildPublicFamilyTree(familyId: string, hideLivingPersons: boolean) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!family) throw new NotFoundException('Family not found');

    const members = await this.prisma.familyMember.findMany({
      where: { familyId, deletedAt: null },
      include: {
        person: {
          select: {
            id: true,
            givenName: true,
            familyName: true,
            birthDate: true,
            deathDate: true,
            isLiving: true,
            privacyLevel: true,
          },
        },
      },
    });

    const viewer = this.access.viewerFromUser(null, true);
    const nodes = [];
    const visiblePersonIds = new Set<string>();
    for (const member of members) {
      const policy = await this.access.loadPersonPolicy(member.person.id);
      if (!policy) continue;
      const redacted = this.access.redactPerson(policy, viewer, hideLivingPersons);
      if (!redacted) continue;
      visiblePersonIds.add(redacted.id);
      nodes.push({
        id: redacted.id,
        personId: redacted.id,
        label: [redacted.givenName, redacted.familyName].filter(Boolean).join(' '),
        givenName: redacted.givenName,
        familyName: redacted.familyName,
        birthDate: redacted.birthDate,
        deathDate: redacted.deathDate,
        isLiving: redacted.isLiving,
        generation: 0,
      });
    }

    const relationships = await this.prisma.relationship.findMany({
      where: {
        deletedAt: null,
        fromPersonId: { in: [...visiblePersonIds] },
        toPersonId: { in: [...visiblePersonIds] },
      },
      select: { id: true, fromPersonId: true, toPersonId: true, type: true },
    });

    const edges = relationships.map((r) => ({
      id: r.id,
      fromPersonId: r.fromPersonId,
      toPersonId: r.toPersonId,
      type: r.type,
    }));

    return {
      familyId: family.id,
      name: family.name,
      members: nodes.map((n) => ({
        personId: n.personId,
        givenName: n.givenName,
        familyName: n.familyName,
        birthDate: n.birthDate,
        deathDate: n.deathDate,
        isLiving: n.isLiving,
      })),
      graph: {
        rootPersonId: nodes[0]?.personId ?? '',
        mode: 'full' as const,
        nodes,
        edges,
      },
    };
  }

  private resolveExpiresAt(expiresAt?: Date | null): Date | null {
    if (expiresAt === null) return null;

    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + 90);

    const resolved = expiresAt ?? fallback;
    if (resolved.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
    return resolved;
  }

  private shareStatus(share: { tokenRevokedAt: Date | null; expiresAt: Date | null }): PublicShareStatus {
    if (share.tokenRevokedAt) return 'revoked';
    if (share.expiresAt && share.expiresAt < new Date()) return 'expired';
    return 'active';
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
      status: this.shareStatus(share),
    };
  }
}
