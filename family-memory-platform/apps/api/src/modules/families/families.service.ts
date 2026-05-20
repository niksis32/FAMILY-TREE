import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateFamilyDto, UpdateFamilyDto } from './families.dto';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.family.findMany({
      where: { deletedAt: null },
      include: { members: { include: { person: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const family = await this.prisma.family.findFirst({
      where: { id, deletedAt: null },
      include: { members: { include: { person: true } }, events: true },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  create(dto: CreateFamilyDto) {
    return this.prisma.family.create({ data: dto });
  }

  async update(id: string, dto: UpdateFamilyDto) {
    await this.ensureExists(id);
    return this.prisma.family.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.family.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const family = await this.prisma.family.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!family) throw new NotFoundException('Family not found');
  }
}
