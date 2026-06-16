import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PersonPrivacySettings,
  PrivacySecurityCenterState,
  TreePrivacySettings,
  UserConsentRecord,
} from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivacyService as CommercialPrivacyService } from '../commercial/privacy.service';
import { PublicLinkService } from './public-link.service';
import { PrivacyAuditService } from './privacy-audit.service';
import { GdprAccountService } from './gdpr-account.service';
import type { UserConsentKey } from '@prisma/client';

@Injectable()
export class PrivacyCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commercialPrivacy: CommercialPrivacyService,
    private readonly publicLinks: PublicLinkService,
    private readonly audit: PrivacyAuditService,
    private readonly gdprAccount: GdprAccountService,
  ) {}

  async getCenter(userId: string): Promise<PrivacySecurityCenterState> {
    const base = await this.commercialPrivacy.getCenter(userId);
    const consents = await this.listConsents(userId);
    const publicShares = await this.publicLinks.listForUser(userId);
    const accessRows = await this.audit.listUserAccessLogs(userId, 30);

    return {
      consents,
      matchProfileOptIn: base.matchProfileOptIn,
      defaultPrivacyLevel: 'PRIVATE',
      requests: base.requests,
      publicShares,
      recentAccessLogs: accessRows.map((r) => ({
        id: r.id,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        userId: r.userId,
        workspaceId: r.workspaceId,
        publicShareId: r.publicShareId,
        ipHash: r.ipHash,
        createdAt: r.createdAt.toISOString(),
        metadata: (r.metadata as Record<string, unknown>) ?? null,
      })),
    };
  }

  async updateConsent(userId: string, consentKey: UserConsentKey, granted: boolean) {
    await this.prisma.userConsent.upsert({
      where: { userId_consentKey: { userId, consentKey } },
      create: {
        userId,
        consentKey,
        granted,
        grantedAt: granted ? new Date() : null,
        revokedAt: granted ? null : new Date(),
      },
      update: {
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: granted ? null : new Date(),
      },
    });

    if (consentKey === 'GLOBAL_MATCHING') {
      await this.commercialPrivacy.updateConsent(userId, granted);
    } else {
      await this.commercialPrivacy.createRequest(userId, 'CONSENT_UPDATE', undefined, {
        consentKey,
        granted,
      });
    }

    return this.getCenter(userId);
  }

  async getPersonSettings(personId: string): Promise<PersonPrivacySettings> {
    const p = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true, privacyLevel: true, isLiving: true },
    });
    if (!p) throw new NotFoundException('Person not found');
    return {
      personId: p.id,
      privacyLevel: p.privacyLevel,
      isLiving: p.isLiving,
    };
  }

  async updatePersonSettings(
    personId: string,
    userId: string,
    data: { privacyLevel?: 'PUBLIC' | 'FAMILY' | 'PRIVATE'; isLiving?: boolean },
  ) {
    await this.prisma.person.update({
      where: { id: personId },
      data: {
        privacyLevel: data.privacyLevel,
        isLiving: data.isLiving,
      },
    });
    await this.audit.logAudit({
      userId,
      action: 'privacy.person.updated',
      entityType: 'Person',
      entityId: personId,
      payload: data,
    });
    return this.getPersonSettings(personId);
  }

  async getTreeSettings(familyId: string): Promise<TreePrivacySettings> {
    const f = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      select: { id: true, hideLivingPersons: true, treePrivacyLevel: true },
    });
    if (!f) throw new NotFoundException('Family not found');
    return {
      familyId: f.id,
      hideLivingPersons: f.hideLivingPersons,
      treePrivacyLevel: f.treePrivacyLevel,
    };
  }

  async updateTreeSettings(
    familyId: string,
    userId: string,
    data: { hideLivingPersons?: boolean; treePrivacyLevel?: 'PUBLIC' | 'FAMILY' | 'PRIVATE' },
  ) {
    await this.prisma.family.update({
      where: { id: familyId },
      data,
    });
    await this.audit.logAudit({
      userId,
      action: 'privacy.tree.updated',
      entityType: 'Family',
      entityId: familyId,
      payload: data,
    });
    return this.getTreeSettings(familyId);
  }

  async requestAccountDelete(userId: string) {
    const req = await this.commercialPrivacy.createRequest(userId, 'DELETE');
    await this.gdprAccount.processDeleteRequest(userId, req.id);
    return req;
  }

  private async listConsents(userId: string): Promise<UserConsentRecord[]> {
    const keys: UserConsentKey[] = [
      'GDPR_DATA_PROCESSING',
      'GLOBAL_MATCHING',
      'AI_LOCAL_PROCESSING',
      'DNA_DATA_IMPORT',
    ];
    const rows = await this.prisma.userConsent.findMany({ where: { userId } });
    const byKey = new Map(rows.map((r) => [r.consentKey, r]));

    return keys.map((key) => {
      const r = byKey.get(key);
      return {
        consentKey: key,
        granted: r?.granted ?? false,
        version: r?.version ?? '1',
        grantedAt: r?.grantedAt?.toISOString() ?? null,
        revokedAt: r?.revokedAt?.toISOString() ?? null,
      };
    });
  }
}
