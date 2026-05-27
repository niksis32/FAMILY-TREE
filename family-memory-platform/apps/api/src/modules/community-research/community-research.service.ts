import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateResearchRequestDto,
  UpdateResearchRequestStatusDto,
  UpsertResearcherProfileDto,
} from './community-research.dto';

@Injectable()
export class CommunityResearchService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: ResearchRequestStatus) {
    return this.prisma.researchRequest.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  create(authorId: string, dto: CreateResearchRequestDto) {
    return this.prisma.researchRequest.create({
      data: {
        authorId,
        surname: dto.surname?.trim() || null,
        region: dto.region?.trim() || null,
        period: dto.period?.trim() || null,
        description: dto.description,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async updateStatus(id: string, authorId: string, isAdmin: boolean, dto: UpdateResearchRequestStatusDto) {
    const r = await this.prisma.researchRequest.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new NotFoundException('Request not found');
    if (!isAdmin && r.authorId !== authorId) throw new NotFoundException('Request not found');
    return this.prisma.researchRequest.update({
      where: { id },
      data: { status: dto.status },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  getProfile(userId: string) {
    return this.prisma.researcherPublicProfile.findUnique({ where: { userId } });
  }

  async upsertProfile(userId: string, dto: UpsertResearcherProfileDto) {
    return this.prisma.researcherPublicProfile.upsert({
      where: { userId },
      create: {
        userId,
        bio: dto.bio,
        specialties: dto.specialties ?? [],
        locale: dto.locale,
        isPublic: dto.isPublic ?? true,
      },
      update: {
        bio: dto.bio,
        specialties: dto.specialties,
        locale: dto.locale,
        isPublic: dto.isPublic,
      },
    });
  }

  async publicProfileByUserId(targetUserId: string) {
    const p = await this.prisma.researcherPublicProfile.findFirst({
      where: { userId: targetUserId, isPublic: true },
      include: { user: { select: { id: true, displayName: true } } },
    });
    if (!p) throw new NotFoundException('Public profile not found');
    return p;
  }
}
