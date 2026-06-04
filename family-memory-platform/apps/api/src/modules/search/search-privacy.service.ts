import { Injectable } from '@nestjs/common';
import {
  canViewDocument,
  canViewPerson,
  normalizePrivacyLevel,
  type PolicyPersonRecord,
  type PolicyViewerContext,
} from '@family/genealogy-core';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { AccessControlService } from '../privacy/access-control.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { SearchDocument } from './search.types';

@Injectable()
export class SearchPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  async filterHits(hits: SearchDocument[], user?: AuthenticatedUser): Promise<SearchDocument[]> {
    if (hits.length === 0) return hits;

    const memberships = user
      ? await this.prisma.workspaceMember.findMany({
          where: { userId: user.id },
          select: { workspaceId: true, role: true },
        })
      : [];

    const memberWorkspaceIds = new Set(memberships.map((m) => m.workspaceId));
    const isPlatformAdmin = user?.role === 'ADMIN';

    const peopleIds = hits.filter((h) => h.category === 'people').map((h) => h.entityId);
    const documentIds = hits.filter((h) => h.category === 'documents').map((h) => h.entityId);

    const [people, documents] = await Promise.all([
      peopleIds.length
        ? this.prisma.person.findMany({
            where: { id: { in: peopleIds }, deletedAt: null },
            select: {
              id: true,
              workspaceId: true,
              givenName: true,
              patronymic: true,
              familyName: true,
              birthDate: true,
              deathDate: true,
              isLiving: true,
              privacyLevel: true,
            },
          })
        : [],
      documentIds.length
        ? this.prisma.document.findMany({
            where: { id: { in: documentIds }, deletedAt: null },
            select: { id: true, workspaceId: true, privacyLevel: true, personId: true },
          })
        : [],
    ]);

    const peopleById = new Map(people.map((p) => [p.id, p]));
    const documentsById = new Map(documents.map((d) => [d.id, d]));

    const viewerCache = new Map<string, PolicyViewerContext>();
    const resolveViewer = async (workspaceId: string | undefined) => {
      const key = workspaceId ?? '__none__';
      if (!viewerCache.has(key)) {
        viewerCache.set(
          key,
          workspaceId
            ? await this.access.viewerForWorkspace(user ?? null, workspaceId)
            : this.access.viewerFromUser(user ?? null),
        );
      }
      return viewerCache.get(key)!;
    };

    const filtered: SearchDocument[] = [];

    for (const hit of hits) {
      if (hit.category === 'people') {
        const person = peopleById.get(hit.entityId);
        if (!person) continue;
        if (!isPlatformAdmin && !memberWorkspaceIds.has(person.workspaceId)) continue;

        const viewer = await resolveViewer(person.workspaceId);
        const policyPerson = this.toPolicyPerson(person);
        if (!canViewPerson(policyPerson, viewer, { hideLivingPersons: true })) continue;

        filtered.push(hit);
        continue;
      }

      if (hit.category === 'documents') {
        const doc = documentsById.get(hit.entityId);
        if (!doc) continue;
        if (!isPlatformAdmin && !memberWorkspaceIds.has(doc.workspaceId)) continue;

        const viewer = await resolveViewer(doc.workspaceId);
        let linkedPerson: PolicyPersonRecord | null = null;
        if (doc.personId) {
          const fromHits = peopleById.get(doc.personId);
          linkedPerson = fromHits
            ? this.toPolicyPerson(fromHits)
            : await this.access.loadPersonPolicy(doc.personId);
        }

        if (
          !canViewDocument(
            { id: doc.id, privacyLevel: doc.privacyLevel.toLowerCase(), personId: doc.personId },
            viewer,
            linkedPerson,
          )
        ) {
          continue;
        }

        filtered.push(hit);
        continue;
      }

      if (hit.category === 'sources') {
        const workspaceId = hit.workspaceId;
        if (workspaceId && !isPlatformAdmin && !memberWorkspaceIds.has(workspaceId)) continue;
        if (!user && workspaceId) continue;
        filtered.push(hit);
        continue;
      }

      filtered.push(hit);
    }

    return filtered;
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
  }): PolicyPersonRecord {
    return {
      id: p.id,
      givenName: p.givenName,
      patronymic: p.patronymic,
      familyName: p.familyName,
      birthDate: p.birthDate?.toISOString() ?? null,
      deathDate: p.deathDate?.toISOString() ?? null,
      isLiving: p.isLiving,
      privacyLevel: normalizePrivacyLevel(p.privacyLevel),
    };
  }
}
