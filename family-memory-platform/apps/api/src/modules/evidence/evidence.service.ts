import { Injectable, NotFoundException } from '@nestjs/common';
import type { BibliographyExport } from '@family/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { SearchService } from '../search/search.service';
import type { CreateCitationTemplateDto, CreateEvidenceCitationDto, UpdateCitationTemplateDto } from './evidence.dto';

const DEFAULT_TEMPLATE = '{{author}}. {{title}}. {{publication}}{{repository}}{{page}}{{detail}}';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  listTemplates() {
    return this.prisma.citationTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  }

  async createTemplate(dto: CreateCitationTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.citationTemplate.updateMany({ data: { isDefault: false } });
    }
    return this.prisma.citationTemplate.create({
      data: workspaceScopedCreateData<Prisma.CitationTemplateUncheckedCreateInput>({
        name: dto.name,
        format: dto.format,
        isDefault: dto.isDefault ?? false,
      }),
    });
  }

  async updateTemplate(id: string, dto: UpdateCitationTemplateDto) {
    await this.ensureTemplate(id);
    if (dto.isDefault) {
      await this.prisma.citationTemplate.updateMany({ data: { isDefault: false } });
    }
    return this.prisma.citationTemplate.update({ where: { id }, data: dto });
  }

  async deleteTemplate(id: string) {
    await this.ensureTemplate(id);
    await this.prisma.citationTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async listCitations(personId?: string, eventId?: string) {
    const rows = await this.prisma.citation.findMany({
      where: {
        deletedAt: null,
        ...(personId ? { personId } : {}),
        ...(eventId ? { eventId } : {}),
      },
      include: { source: true },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return rows.map((r) => this.toCitationSummary(r));
  }

  async createCitation(dto: CreateEvidenceCitationDto) {
    const source = await this.prisma.source.findFirst({ where: { id: dto.sourceId, deletedAt: null } });
    if (!source) throw new NotFoundException('Source not found');

    if (dto.eventId) {
      const event = await this.prisma.event.findFirst({ where: { id: dto.eventId, deletedAt: null } });
      if (!event) throw new NotFoundException('Event not found');
    }

    const template = await this.resolveTemplate();
    const formattedCitation = this.formatCitation(template, source, dto);
    const qualityScore = this.scoreCitation(source, dto);

    const row = await this.prisma.citation.create({
      data: workspaceScopedCreateData<Prisma.CitationUncheckedCreateInput>({
        sourceId: dto.sourceId,
        personId: dto.personId,
        eventId: dto.eventId,
        page: dto.page,
        detail: dto.detail,
        formattedCitation,
        qualityScore,
      }),
      include: { source: true },
    });

    await this.search.indexCitation(row.id);
    return this.toCitationSummary(row);
  }

  async exportBibliography(format: 'text' | 'bibtex' | 'json' = 'text'): Promise<BibliographyExport> {
    const rows = await this.prisma.citation.findMany({
      where: { deletedAt: null },
      include: { source: true },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'asc' }],
      take: 1000,
    });

    const entries = rows.map((r) => {
      const formatted =
        r.formattedCitation ??
        this.formatCitation(DEFAULT_TEMPLATE, r.source, {
          page: r.page ?? undefined,
          detail: r.detail ?? undefined,
        });
      return {
        citationId: r.id,
        sourceTitle: r.source.title,
        formatted,
        qualityScore: r.qualityScore,
      };
    });

    if (format === 'bibtex') {
      return {
        format,
        generatedAt: new Date().toISOString(),
        entries: entries.map((e) => ({
          ...e,
          formatted: `@misc{${e.citationId},\n  title = {${e.sourceTitle}},\n  note = {${e.formatted}}\n}`,
        })),
      };
    }

    return {
      format,
      generatedAt: new Date().toISOString(),
      entries,
    };
  }

  private async resolveTemplate() {
    const tpl = await this.prisma.citationTemplate.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });
    return tpl?.format ?? DEFAULT_TEMPLATE;
  }

  private formatCitation(
    template: string,
    source: {
      title: string;
      author: string | null;
      publication: string | null;
      repository: string | null;
      url: string | null;
    },
    dto: { page?: string; detail?: string },
  ) {
    const replacements: Record<string, string> = {
      '{{author}}': source.author ?? '',
      '{{title}}': source.title,
      '{{publication}}': source.publication ? `${source.publication}. ` : '',
      '{{repository}}': source.repository ? `${source.repository}. ` : '',
      '{{url}}': source.url ?? '',
      '{{page}}': dto.page ? `p. ${dto.page}. ` : '',
      '{{detail}}': dto.detail ?? '',
    };

    let out = template;
    for (const [key, value] of Object.entries(replacements)) {
      out = out.split(key).join(value);
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  private scoreCitation(
    source: { author: string | null; publication: string | null; repository: string | null; url: string | null },
    dto: { page?: string; detail?: string; eventId?: string; personId?: string },
  ) {
    let score = 20;
    if (source.author) score += 15;
    if (source.publication) score += 15;
    if (source.repository) score += 10;
    if (source.url) score += 10;
    if (dto.page) score += 15;
    if (dto.detail) score += 10;
    if (dto.eventId) score += 10;
    if (dto.personId) score += 5;
    return Math.min(score, 100);
  }

  private toCitationSummary(row: {
    id: string;
    sourceId: string;
    personId: string | null;
    eventId: string | null;
    page: string | null;
    detail: string | null;
    qualityScore: number;
    formattedCitation: string | null;
    source: { title: string };
  }) {
    return {
      id: row.id,
      sourceId: row.sourceId,
      sourceTitle: row.source.title,
      personId: row.personId,
      eventId: row.eventId,
      page: row.page,
      detail: row.detail,
      qualityScore: row.qualityScore,
      formattedCitation: row.formattedCitation,
    };
  }

  private async ensureTemplate(id: string) {
    const row = await this.prisma.citationTemplate.findFirst({ where: { id } });
    if (!row) throw new NotFoundException('Citation template not found');
  }
}
