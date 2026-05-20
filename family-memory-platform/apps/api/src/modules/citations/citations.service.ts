import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCitationDto, UpdateCitationDto } from './citations.dto';

@Injectable()
export class CitationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.citation.findMany({
      where: { deletedAt: null },
      include: { source: true, person: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const citation = await this.prisma.citation.findFirst({
      where: { id, deletedAt: null },
      include: { source: true, person: true },
    });
    if (!citation) throw new NotFoundException('Citation not found');
    return citation;
  }

  create(dto: CreateCitationDto) {
    return this.prisma.citation.create({ data: dto });
  }

  async update(id: string, dto: UpdateCitationDto) {
    await this.ensureExists(id);
    return this.prisma.citation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.citation.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const citation = await this.prisma.citation.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!citation) throw new NotFoundException('Citation not found');
  }
}
