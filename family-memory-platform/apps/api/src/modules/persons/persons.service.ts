import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Person, Prisma } from '@prisma/client';
import {
  defaultPrivacyForNewLivingPerson,
  type PolicyPersonRecord,
  type PolicyViewerContext,
} from '@family/genealogy-core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  workspaceScopedCreateData,
  type WorkspaceScopedUncheckedCreate,
} from '../../prisma/workspace-scoped-create';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { AccessControlService } from '../privacy/access-control.service';
import type { CreatePersonDto, UpdatePersonDto } from './persons.dto';
import { WebhookEmitterService } from '../webhooks/webhook-emitter.service';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly media: MediaService,
    private readonly access: AccessControlService,
    @Optional() private readonly webhooks?: WebhookEmitterService,
  ) {}

  async findAll(user?: AuthenticatedUser) {
    const rows = await this.prisma.person.findMany({
      where: { deletedAt: null },
      orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
      take: 200,
    });
    const viewerCache = new Map<string, PolicyViewerContext>();
    const summaries = [];

    for (const person of rows) {
      const viewer = await this.resolveViewerForWorkspace(user, person.workspaceId, viewerCache);
      const policy = this.toPolicyPerson(person);
      if (!this.access.canViewPersonRecord(policy, viewer)) continue;
      summaries.push(await this.toPersonSummary(person, viewer));
    }

    return summaries;
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const person = await this.prisma.person.findFirst({
      where: { id, deletedAt: null },
      include: {
        familyMembers: { include: { family: true } },
        events: true,
        media: true,
        documents: true,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const viewer = await this.access.viewerForWorkspace(user ?? null, person.workspaceId);
    const policy = this.toPolicyPerson(person);
    if (!this.access.canViewPersonRecord(policy, viewer)) {
      throw new NotFoundException('Person not found');
    }

    const redacted = this.access.redactPerson(policy, viewer) ?? policy;
    const showLivingPhoto =
      !person.isLiving || viewer.role === 'editor' || viewer.role === 'admin';
    const primaryPhotoUrl =
      person.avatarMediaId && showLivingPhoto
        ? await this.resolvePhotoUrl(person.avatarMediaId)
        : null;

    return {
      ...person,
      givenName: redacted.givenName,
      familyName: redacted.familyName,
      biography: redacted.biography,
      birthDate: redacted.birthDate ? new Date(redacted.birthDate) : person.birthDate,
      primaryPhotoUrl,
    };
  }

  async create(dto: CreatePersonDto) {
    const person = await this.prisma.person.create({
      data: workspaceScopedCreateData(this.toPersonCreateData(dto)),
    });
    await this.indexPerson(person.id);
    void this.emitPersonCreatedWebhook(person);
    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    await this.ensureExists(id);
    const person = await this.prisma.person.update({
      where: { id },
      data: this.toPersonData(dto),
    });
    await this.indexPerson(person.id);
    return person;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureExists(id: string) {
    const person = await this.prisma.person.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
  }

  private toPersonCreateData(
    dto: CreatePersonDto,
  ): WorkspaceScopedUncheckedCreate<Prisma.PersonUncheckedCreateInput> {
    const isLiving = dto.isLiving ?? true;
    const privacyLevel =
      dto.privacyLevel ??
      (isLiving ? defaultPrivacyForNewLivingPerson().toUpperCase() : 'PUBLIC');

    return {
      givenName: dto.givenName,
      patronymic: dto.patronymic,
      familyName: dto.familyName,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
      isLiving,
      privacyLevel: privacyLevel as Prisma.PersonUncheckedCreateInput['privacyLevel'],
      biography: dto.biography,
      avatarMediaId: dto.avatarMediaId,
    };
  }

  private toPersonData(dto: UpdatePersonDto): Prisma.PersonUncheckedUpdateInput {
    return {
      givenName: dto.givenName,
      patronymic: dto.patronymic,
      familyName: dto.familyName,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
      isLiving: dto.isLiving,
      privacyLevel: dto.privacyLevel,
      biography: dto.biography,
      avatarMediaId: dto.avatarMediaId,
    };
  }

  private async resolveViewerForWorkspace(
    user: AuthenticatedUser | undefined,
    workspaceId: string,
    cache: Map<string, PolicyViewerContext>,
  ): Promise<PolicyViewerContext> {
    if (!cache.has(workspaceId)) {
      cache.set(workspaceId, await this.access.viewerForWorkspace(user ?? null, workspaceId));
    }
    return cache.get(workspaceId)!;
  }

  private toPolicyPerson(
    person: Pick<
      Person,
      | 'id'
      | 'givenName'
      | 'patronymic'
      | 'familyName'
      | 'birthDate'
      | 'deathDate'
      | 'isLiving'
      | 'privacyLevel'
      | 'biography'
    >,
  ): PolicyPersonRecord {
    return {
      id: person.id,
      givenName: person.givenName,
      patronymic: person.patronymic,
      familyName: person.familyName,
      isLiving: person.isLiving,
      privacyLevel: person.privacyLevel.toLowerCase(),
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      biography: person.biography,
    };
  }

  private async toPersonSummary(person: Person, viewer: PolicyViewerContext) {
    const showLivingPhoto =
      !person.isLiving || viewer.role === 'editor' || viewer.role === 'admin';
    return {
      id: person.id,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      givenName: person.givenName,
      patronymic: person.patronymic,
      familyName: person.familyName,
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      gender: person.gender,
      privacyLevel: person.privacyLevel,
      primaryPhotoUrl:
        person.avatarMediaId && showLivingPhoto
          ? await this.resolvePhotoUrl(person.avatarMediaId)
          : null,
    };
  }

  private async resolvePhotoUrl(mediaId: string) {
    try {
      const result = await this.media.createDownloadUrl(mediaId);
      return result.downloadUrl;
    } catch {
      return null;
    }
  }

  private async indexPerson(personId: string) {
    try {
      await this.search.indexPerson(personId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }

  private async emitPersonCreatedWebhook(
    person: Pick<
      Person,
      'id' | 'workspaceId' | 'givenName' | 'familyName' | 'birthDate' | 'deathDate' | 'isLiving' | 'privacyLevel'
    >,
  ) {
    if (!this.webhooks) return;
    try {
      const displayName = [person.givenName, person.familyName].filter(Boolean).join(' ');
      await this.webhooks.emit({
        workspaceId: person.workspaceId,
        eventType: 'PERSON_CREATED',
        entityType: 'person',
        entityId: person.id,
        data: {
          personId: person.id,
          displayName,
          birthYear: person.isLiving ? null : person.birthDate?.getUTCFullYear() ?? null,
          deathYear: person.isLiving ? null : person.deathDate?.getUTCFullYear() ?? null,
          isLiving: person.isLiving,
          privacyLevel: person.privacyLevel,
          url: `/persons/${person.id}`,
        },
      });
    } catch {
      // Webhook delivery must not block person create.
    }
  }
}
