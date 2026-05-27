import { Injectable } from '@nestjs/common';
import type { Person as GenealogyPerson } from '@family/genealogy-core';
import { redactPersonForStory, type StoryPrivacyOptions } from '@family/genealogy-core';
import type { PublicStoryPersonDto, StoryVisibilityLevel } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';

type DbPerson = {
  id: string;
  givenName: string;
  patronymic: string | null;
  familyName: string | null;
  birthDate: Date | null;
  deathDate: Date | null;
  isLiving: boolean;
  privacyLevel: string;
  biography: string | null;
};

@Injectable()
export class FamilyStoriesPrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async loadScopePersons(scopeType: string, scopePersonId: string | null, scopeFamilyId: string | null) {
    if (scopeType === 'PERSON' && scopePersonId) {
      const person = await this.prisma.person.findFirst({
        where: { id: scopePersonId, deletedAt: null },
      });
      return person ? [person] : [];
    }

    if (scopeType === 'FAMILY_BRANCH' && scopeFamilyId) {
      const members = await this.prisma.familyMember.findMany({
        where: { familyId: scopeFamilyId, deletedAt: null },
        include: { person: true },
      });
      return members.map((m) => m.person).filter((p) => p.deletedAt === null);
    }

    return [];
  }

  toGenealogyPerson(p: DbPerson): GenealogyPerson {
    return {
      id: p.id,
      givenName: p.givenName,
      middleName: p.patronymic,
      familyName: p.familyName,
      birthDate: p.birthDate?.toISOString() ?? null,
      deathDate: p.deathDate?.toISOString() ?? null,
      isLiving: p.isLiving,
      privacyLevel: (p.privacyLevel?.toLowerCase() ?? 'family') as GenealogyPerson['privacyLevel'],
    } as GenealogyPerson & { biography?: string | null };
  }

  redactPersons(
    persons: DbPerson[],
    options: StoryPrivacyOptions,
  ): PublicStoryPersonDto[] {
    return persons
      .map((p) => {
        const view = redactPersonForStory(this.toGenealogyPerson(p), options);
        if (!view) return null;
        const row: PublicStoryPersonDto = {
          id: view.id,
          displayName: view.displayName,
          birthYear: view.birthYear ?? null,
          deathYear: view.deathYear ?? null,
          isHidden: view.isHidden,
        };
        return row;
      })
      .filter((p): p is PublicStoryPersonDto => p !== null);
  }

  canAccessStory(params: {
    visibility: StoryVisibilityLevel;
    tokenRevokedAt: Date | null;
    isOwner: boolean;
    isWorkspaceMember: boolean;
    hasValidToken: boolean;
    isAuthenticated: boolean;
  }): boolean {
    if (params.tokenRevokedAt) return false;
    if (params.isOwner) return true;

    switch (params.visibility) {
      case 'private':
        return false;
      case 'family_only':
        return params.isAuthenticated && params.isWorkspaceMember;
      case 'public':
        return true;
      case 'link_only':
      default:
        return params.hasValidToken;
    }
  }
}
