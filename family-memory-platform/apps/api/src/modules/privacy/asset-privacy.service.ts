import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PolicyMediaRecord, PolicyPersonRecord } from '@family/genealogy-core';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessControlService } from './access-control.service';

type MediaRow = {
  id: string;
  workspaceId: string;
  privacyLevel: string;
  personId: string | null;
};

type DocumentRow = {
  id: string;
  workspaceId: string;
  privacyLevel: string;
  personId: string | null;
};

@Injectable()
export class AssetPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  async assertCanViewMedia(mediaId: string, user?: AuthenticatedUser | null, isPublicLink = false) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true, workspaceId: true, privacyLevel: true, personId: true, storageKey: true, bucket: true },
    });
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    const allowed = await this.canViewMediaRow(media, user, isPublicLink);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this media');
    }

    return media;
  }

  async filterVisibleMedia<T extends MediaRow>(rows: T[], user?: AuthenticatedUser | null): Promise<T[]> {
    if (rows.length === 0) return rows;

    const personIds = [...new Set(rows.map((r) => r.personId).filter(Boolean))] as string[];
    const policyPeople = new Map<string, PolicyPersonRecord | null>();
    for (const personId of personIds) {
      policyPeople.set(personId, await this.access.loadPersonPolicy(personId));
    }

    const viewerCache = new Map<string, Awaited<ReturnType<AccessControlService['viewerForWorkspace']>>>();
    const filtered: T[] = [];

    for (const row of rows) {
      const cacheKey = row.workspaceId;
      if (!viewerCache.has(cacheKey)) {
        viewerCache.set(cacheKey, await this.access.viewerForWorkspace(user ?? null, row.workspaceId));
      }
      const viewer = viewerCache.get(cacheKey)!;
      const person = row.personId ? (policyPeople.get(row.personId) ?? null) : null;
      const policyMedia: PolicyMediaRecord = {
        id: row.id,
        privacyLevel: row.privacyLevel,
        personId: row.personId,
        linkedPersonIsLiving: person?.isLiving,
      };
      if (this.access.canViewMediaRecord(policyMedia, viewer, person)) {
        filtered.push(row);
      }
    }

    return filtered;
  }

  async assertCanViewDocument(documentId: string, user?: AuthenticatedUser | null, isPublicLink = false) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
      select: {
        id: true,
        workspaceId: true,
        privacyLevel: true,
        personId: true,
        storageKey: true,
        bucket: true,
        mimeType: true,
        title: true,
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const allowed = await this.canViewDocumentRow(document, user, isPublicLink);
    if (!allowed) {
      throw new ForbiddenException('Access denied to this document');
    }

    return document;
  }

  async filterVisibleDocuments<T extends DocumentRow>(rows: T[], user?: AuthenticatedUser | null): Promise<T[]> {
    if (rows.length === 0) return rows;

    const personIds = [...new Set(rows.map((r) => r.personId).filter(Boolean))] as string[];
    const policyPeople = new Map<string, PolicyPersonRecord | null>();
    for (const personId of personIds) {
      policyPeople.set(personId, await this.access.loadPersonPolicy(personId));
    }

    const viewerCache = new Map<string, Awaited<ReturnType<AccessControlService['viewerForWorkspace']>>>();
    const filtered: T[] = [];

    for (const row of rows) {
      if (!viewerCache.has(row.workspaceId)) {
        viewerCache.set(row.workspaceId, await this.access.viewerForWorkspace(user ?? null, row.workspaceId));
      }
      const viewer = viewerCache.get(row.workspaceId)!;
      const person = row.personId ? (policyPeople.get(row.personId) ?? null) : null;
      if (
        this.access.canViewDocumentRecord(
          { id: row.id, privacyLevel: row.privacyLevel, personId: row.personId, linkedPersonIsLiving: person?.isLiving },
          viewer,
          person,
        )
      ) {
        filtered.push(row);
      }
    }

    return filtered;
  }

  private async canViewMediaRow(media: MediaRow, user?: AuthenticatedUser | null, isPublicLink = false) {
    const viewer = await this.access.viewerForWorkspace(user ?? null, media.workspaceId, isPublicLink);
    const person = media.personId ? await this.access.loadPersonPolicy(media.personId) : null;
    return this.access.canViewMediaRecord(
      {
        id: media.id,
        privacyLevel: media.privacyLevel,
        personId: media.personId,
        linkedPersonIsLiving: person?.isLiving,
      },
      viewer,
      person,
    );
  }

  private async canViewDocumentRow(document: DocumentRow, user?: AuthenticatedUser | null, isPublicLink = false) {
    const viewer = await this.access.viewerForWorkspace(user ?? null, document.workspaceId, isPublicLink);
    const person = document.personId ? await this.access.loadPersonPolicy(document.personId) : null;
    return this.access.canViewDocumentRecord(
      {
        id: document.id,
        privacyLevel: document.privacyLevel,
        personId: document.personId,
        linkedPersonIsLiving: person?.isLiving,
      },
      viewer,
      person,
    );
  }
}
