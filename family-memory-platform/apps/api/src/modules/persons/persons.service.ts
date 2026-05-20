import { Injectable, NotFoundException } from '@nestjs/common';
import type { Person, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { SearchService } from '../search/search.service';
import type { CreatePersonDto, UpdatePersonDto } from './persons.dto';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly media: MediaService,
  ) {}

  async findAll() {
    const rows = await this.prisma.person.findMany({
      where: { deletedAt: null },
      orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
      take: 200,
    });
    return Promise.all(rows.map((person) => this.toPersonSummary(person)));
  }

  async findOne(id: string) {
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

    return {
      ...person,
      primaryPhotoUrl: person.avatarMediaId ? await this.resolvePhotoUrl(person.avatarMediaId) : null,
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
    return {
      givenName: dto.givenName,
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

  private toPersonData(dto: UpdatePersonDto): Prisma.PersonUncheckedUpdateInput {
    return {
      givenName: dto.givenName,
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
      familyName: person.familyName,
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      gender: person.gender,
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
