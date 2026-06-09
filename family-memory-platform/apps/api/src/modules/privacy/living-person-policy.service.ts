import { Injectable } from '@nestjs/common';
import {
  buildPolicyViewer,
  defaultPrivacyForInferredLiving,
  inferIsLiving,
  redactPersonForViewer,
} from '@family/genealogy-core';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class LivingPersonPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  evaluatePerson(person: {
    birthDate: Date | null;
    deathDate: Date | null;
    isLiving: boolean;
    privacyLevel: string;
  }) {
    const living = inferIsLiving({
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      isLiving: person.isLiving,
    });
    const suggestedPrivacy = defaultPrivacyForInferredLiving(living);
    return { isLiving: living, suggestedPrivacy };
  }

  async recalcWorkspace(workspaceId: string) {
    const persons = await this.prisma.person.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, birthDate: true, deathDate: true, isLiving: true, privacyLevel: true },
    });

    let updated = 0;
    for (const person of persons) {
      const next = this.evaluatePerson(person);
      const privacyLevel = next.suggestedPrivacy.toUpperCase() as 'PUBLIC' | 'FAMILY' | 'PRIVATE';
      if (person.isLiving !== next.isLiving || person.privacyLevel !== privacyLevel) {
        await this.prisma.person.update({
          where: { id: person.id },
          data: { isLiving: next.isLiving, privacyLevel },
        });
        updated += 1;
      }
    }

    return { workspaceId, scanned: persons.length, updated };
  }

  async recalcAllWorkspaces() {
    const workspaces = await this.prisma.workspace.findMany({ select: { id: true } });
    const results = [];
    for (const ws of workspaces) {
      results.push(await this.recalcWorkspace(ws.id));
    }
    return { workspaces: results.length, results };
  }

  redactPersonForExport(person: {
    id: string;
    givenName: string;
    familyName?: string | null;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    isLiving: boolean;
    privacyLevel: string;
    biography?: string | null;
  }) {
    const viewer = buildPolicyViewer({ isPublicLink: true });
    const record = {
      id: person.id,
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate instanceof Date ? person.birthDate.toISOString() : person.birthDate ?? null,
      deathDate: person.deathDate instanceof Date ? person.deathDate.toISOString() : person.deathDate ?? null,
      isLiving: inferIsLiving({
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        isLiving: person.isLiving,
      }),
      privacyLevel: person.privacyLevel.toLowerCase(),
      biography: person.biography ?? null,
    };
    return redactPersonForViewer(record, viewer, { hideLivingPersons: true });
  }
}
