import { Injectable, NotFoundException } from '@nestjs/common';
import type { Person, Prisma } from '@prisma/client';
import { defaultPrivacyForNewLivingPerson } from '@family/genealogy-core';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { AccessControlService } from '../privacy/access-control.service';
import type { CreatePersonDto, UpdatePersonDto } from './persons.dto';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly media: MediaService,
    private readonly access: AccessControlService,
  ) {}

  async findAll(user?: AuthenticatedUser) {
    const viewer = this.access.viewerFromUser(user ?? null);
    const rows = await this.prisma.person.findMany({
      where: { deletedAt: null },
      orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
      take: 200,
    });
    const summaries = await Promise.all(rows.map((person) => this.toPersonSummary(person)));
    return summaries.filter((_, i) => {
      const row = rows[i];
      const policy = {
        id: row.id,
        givenName: row.givenName,
        familyName: row.familyName,
        isLiving: row.isLiving,
        privacyLevel: row.privacyLevel.toLowerCase(),
        birthDate: row.birthDate?.toISOString() ?? null,
        deathDate: row.deathDate?.toISOString() ?? null,
      };
      return this.access.canViewPersonRecord(policy, viewer);
    });
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

    const viewer = this.access.viewerFromUser(user ?? null);
    const policy = {
      id: person.id,
      givenName: person.givenName,
      familyName: person.familyName,
      patronymic: person.patronymic,
      isLiving: person.isLiving,
      privacyLevel: person.privacyLevel.toLowerCase(),
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      biography: person.biography,
    };
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
      data: this.toPersonCreateData(dto),
    });
    await this.indexPerson(person.id);
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

  private toPersonCreateData(dto: CreatePersonDto): Prisma.PersonUncheckedCreateInput {
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

  private async toPersonSummary(person: Person) {
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
      primaryPhotoUrl: person.avatarMediaId ? await this.resolvePhotoUrl(person.avatarMediaId) : null,
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
}
