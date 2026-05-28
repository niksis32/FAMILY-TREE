import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import {
  buildPolicyViewer,
  canViewDocument,
  canViewMedia,
  canViewPerson,
  redactPersonForViewer,
  type PolicyDocumentRecord,
  type PolicyMediaRecord,
  type PolicyPersonRecord,
  type PolicyViewerContext,
} from '@family/genealogy-core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  viewerFromUser(user?: { id: string; role: UserRole } | null, isPublicLink = false): PolicyViewerContext {
    const roleMap = {
      VIEWER: 'viewer',
      EDITOR: 'editor',
      ADMIN: 'admin',
    } as const;

    if (!user) {
      return buildPolicyViewer({ isPublicLink });
    }

    return buildPolicyViewer({
      userId: user.id,
      role: roleMap[user.role] ?? 'viewer',
      isFamilyMember: user.role !== 'VIEWER' || isPublicLink,
      isPublicLink,
    });
  }

  async loadPersonPolicy(personId: string): Promise<PolicyPersonRecord | null> {
    const p = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: {
        id: true,
        givenName: true,
        patronymic: true,
        familyName: true,
        birthDate: true,
        deathDate: true,
        isLiving: true,
        privacyLevel: true,
        biography: true,
      },
    });
    if (!p) return null;
    return this.toPolicyPerson(p);
  }

  canViewPersonRecord(person: PolicyPersonRecord, viewer: PolicyViewerContext, hideLivingPersons = true) {
    return canViewPerson(person, viewer, { hideLivingPersons });
  }

  redactPerson(person: PolicyPersonRecord, viewer: PolicyViewerContext, hideLivingPersons = true) {
    return redactPersonForViewer(person, viewer, { hideLivingPersons });
  }

  canViewMediaRecord(
    media: PolicyMediaRecord,
    viewer: PolicyViewerContext,
    person?: PolicyPersonRecord | null,
  ) {
    return canViewMedia(media, viewer, person);
  }

  canViewDocumentRecord(
    doc: PolicyDocumentRecord,
    viewer: PolicyViewerContext,
    person?: PolicyPersonRecord | null,
  ) {
    return canViewDocument(doc, viewer, person);
  }

  async familyHideLiving(familyId: string): Promise<boolean> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      select: { hideLivingPersons: true },
    });
    return family?.hideLivingPersons ?? true;
  }

  private toPolicyPerson(p: {
    id: string;
    givenName: string;
    patronymic: string | null;
    familyName: string | null;
    birthDate: Date | null;
    deathDate: Date | null;
    isLiving: boolean;
    privacyLevel: string;
    biography: string | null;
  }): PolicyPersonRecord {
    return {
      id: p.id,
      givenName: p.givenName,
      patronymic: p.patronymic,
      familyName: p.familyName,
      birthDate: p.birthDate?.toISOString() ?? null,
      deathDate: p.deathDate?.toISOString() ?? null,
      isLiving: p.isLiving,
      privacyLevel: p.privacyLevel.toLowerCase(),
      biography: p.biography,
    };
  }
}
