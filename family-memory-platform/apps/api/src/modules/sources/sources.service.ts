import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { SearchService } from '../search/search.service';
import type { CreateSourceDto, UpdateSourceDto } from './sources.dto';

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  findAll() {
    return this.prisma.source.findMany({ where: { deletedAt: null }, orderBy: { title: 'asc' }, take: 500 });
  }

  async findOne(id: string) {
    const source = await this.prisma.source.findFirst({
      where: { id, deletedAt: null },
      include: { citations: true, documents: true, relationships: true },
    });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async create(dto: CreateSourceDto) {
    const source = await this.prisma.source.create({
      data: workspaceScopedCreateData<Prisma.SourceUncheckedCreateInput>({
        title: dto.title,
        author: dto.author,
        publication: dto.publication,
        repository: dto.repository,
        url: dto.url,
        notes: dto.notes,
      }),
    });
    await this.indexSource(source.id);
    return source;
  }

  async update(id: string, dto: UpdateSourceDto) {
    await this.ensureExists(id);
    const source = await this.prisma.source.update({ where: { id }, data: dto });
    await this.indexSource(source.id);
    return source;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.source.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const source = await this.prisma.source.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!source) throw new NotFoundException('Source not found');
  }

  private async indexSource(sourceId: string) {
    try {
      await this.search.indexSource(sourceId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }
}
