import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateFaceTagDto, UpdateFaceTagDto } from './face-tags.dto';

@Injectable()
export class FaceTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByMedia(mediaId: string) {
    await this.ensureMedia(mediaId);
    return this.prisma.photoFaceTag.findMany({
      where: { mediaId },
      orderBy: { createdAt: 'asc' },
      include: {
        person: {
          select: {
            id: true,
            givenName: true,
            patronymic: true,
            familyName: true,
            birthDate: true,
            deathDate: true,
            isLiving: true,
          },
        },
      },
    });
  }

  async create(mediaId: string, dto: CreateFaceTagDto, userId?: string) {
    await this.ensureMedia(mediaId);
    if (dto.personId) {
      await this.ensurePerson(dto.personId);
    }

    return this.prisma.photoFaceTag.create({
      data: {
        mediaId,
        personId: dto.personId,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        confidence: dto.confidence,
        label: dto.label,
        note: dto.note,
        source: 'MANUAL',
        createdBy: userId,
      },
      include: {
        person: {
          select: {
            id: true,
            givenName: true,
            patronymic: true,
            familyName: true,
            birthDate: true,
            deathDate: true,
            isLiving: true,
          },
        },
      },
    });
  }

  async update(tagId: string, dto: UpdateFaceTagDto) {
    const existing = await this.prisma.photoFaceTag.findUnique({ where: { id: tagId } });
    if (!existing) {
      throw new NotFoundException('Face tag not found');
    }

    if (dto.personId) {
      await this.ensurePerson(dto.personId);
    }

    return this.prisma.photoFaceTag.update({
      where: { id: tagId },
      data: {
        personId: dto.personId === undefined ? undefined : dto.personId,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        label: dto.label,
        note: dto.note,
      },
      include: {
        person: {
          select: {
            id: true,
            givenName: true,
            patronymic: true,
            familyName: true,
            birthDate: true,
            deathDate: true,
            isLiving: true,
          },
        },
      },
    });
  }

  async remove(tagId: string) {
    const existing = await this.prisma.photoFaceTag.findUnique({ where: { id: tagId } });
    if (!existing) {
      throw new NotFoundException('Face tag not found');
    }
    await this.prisma.photoFaceTag.delete({ where: { id: tagId } });
    return { deleted: true, id: tagId };
  }

  async createManyAiDrafts(
    mediaId: string,
    faces: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
      label?: string;
    }>,
    userId?: string,
  ) {
    await this.ensureMedia(mediaId);
    if (faces.length === 0) return [];

    return this.prisma.$transaction(
      faces.map((face) =>
        this.prisma.photoFaceTag.create({
          data: {
            mediaId,
            x: face.x,
            y: face.y,
            width: face.width,
            height: face.height,
            confidence: face.confidence,
            label: face.label,
            source: 'AI',
            createdBy: userId,
          },
        }),
      ),
    );
  }

  private async ensureMedia(mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    if (!media) {
      throw new NotFoundException('Media file not found');
    }
    return media;
  }

  private async ensurePerson(personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
    });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
  }
}
