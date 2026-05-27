import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityGroupType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommunityGroupDto, ListCommunityGroupsQueryDto } from './community-groups.dto';

@Injectable()
export class CommunityGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: ListCommunityGroupsQueryDto) {
    const where: Prisma.CommunityGroupWhereInput = {
      deletedAt: null,
      visibility: 'PUBLIC',
    };
    if (query.type) where.type = query.type;
    if (query.q?.trim()) {
      where.OR = [
        { title: { contains: query.q.trim(), mode: 'insensitive' } },
        { description: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }
    return this.prisma.communityGroup.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { owner: { select: { id: true, displayName: true } } },
    });
  }

  async listByType(type: CommunityGroupType) {
    return this.listPublic({ type });
  }

  async create(ownerId: string, dto: CreateCommunityGroupDto) {
    return this.prisma.communityGroup.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility ?? 'PUBLIC',
        ownerId,
        slug: dto.slug?.trim() || null,
        regionLabel: dto.regionLabel?.trim() || null,
        countryCode: dto.countryCode?.trim()?.toUpperCase() || null,
        periodFrom: dto.periodFrom ?? null,
        periodTo: dto.periodTo ?? null,
      },
      include: { owner: { select: { id: true, displayName: true } } },
    });
  }

  async findOne(id: string) {
    const g = await this.prisma.communityGroup.findFirst({
      where: { id, deletedAt: null },
      include: { owner: { select: { id: true, displayName: true } } },
    });
    if (!g) throw new NotFoundException('Group not found');
    return g;
  }

  async assertGroupVisibleToUser(groupId: string, userId?: string) {
    const g = await this.findOne(groupId);
    if (g.visibility === 'PUBLIC') return g;
    if (!userId) throw new NotFoundException('Group not found');
    if (g.ownerId === userId) return g;
    // MVP: private groups only owner — extend with membership later
    throw new NotFoundException('Group not found');
  }
}
