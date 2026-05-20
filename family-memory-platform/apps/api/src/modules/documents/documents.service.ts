import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  findAll() {
    return this.prisma.document.findMany({
      where: { deletedAt: null },
      include: { person: true, media: true, source: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { person: true, media: true, source: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async create(dto: CreateDocumentDto) {
    const document = await this.prisma.document.create({ data: dto });
    await this.indexDocument(document.id);
    return document;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.ensureExists(id);
    const document = await this.prisma.document.update({ where: { id }, data: dto });
    await this.indexDocument(document.id);
    return document;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const document = await this.prisma.document.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!document) throw new NotFoundException('Document not found');
  }

  private async indexDocument(documentId: string) {
    try {
      await this.search.indexDocument(documentId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }
}
