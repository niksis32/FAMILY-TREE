import { Injectable } from '@nestjs/common';
import type { ExternalArchiveImportResult, ExternalArchiveRecordSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SourcesService } from '../sources/sources.service';

@Injectable()
export class ImportAsSourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sources: SourcesService,
  ) {}

  async importRecord(input: {
    record: ExternalArchiveRecordSummary;
    personId?: string;
    titleOverride?: string;
  }): Promise<ExternalArchiveImportResult> {
    const { record, personId, titleOverride } = input;
    const existing = await this.sources.findByExternalRecord(record.provider, record.id);

    if (existing) {
      const hint = await this.ensureHint(existing.id, record, personId);
      return {
        sourceId: existing.id,
        hintId: hint?.id ?? null,
        created: false,
        provider: record.provider,
        externalRecordId: record.id,
        attributionText: record.attributionText,
      };
    }

    const source = await this.sources.create({
      title: titleOverride ?? record.title,
      author: record.provider === 'FAMILYSEARCH' ? 'FamilySearch' : record.provider,
      repository: record.provider,
      url: record.url,
      notes: this.buildNotes(record),
      externalProvider: record.provider,
      externalRecordId: record.id,
      attributionText: record.attributionText,
    });

    const hint = await this.ensureHint(source.id, record, personId);

    return {
      sourceId: source.id,
      hintId: hint?.id ?? null,
      created: true,
      provider: record.provider,
      externalRecordId: record.id,
      attributionText: record.attributionText,
    };
  }

  private buildNotes(record: ExternalArchiveRecordSummary): string {
    const lines = [
      record.givenName || record.familyName
        ? `Name: ${[record.givenName, record.familyName].filter(Boolean).join(' ')}`
        : null,
      record.birthDate ? `Birth: ${record.birthDate}` : null,
      record.deathDate ? `Death: ${record.deathDate}` : null,
      record.place ? `Place: ${record.place}` : null,
      record.recordType ? `Record type: ${record.recordType}` : null,
      record.attributionText,
    ].filter(Boolean);

    return lines.join('\n');
  }

  private async ensureHint(sourceId: string, record: ExternalArchiveRecordSummary, personId?: string) {
    const existing = await this.prisma.hint.findFirst({
      where: {
        source: 'EXTERNAL_ARCHIVE',
        entityType: 'source',
        entityId: sourceId,
        status: 'OPEN',
      },
    });
    if (existing) return existing;

    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, deletedAt: null },
      select: { workspaceId: true },
    });
    if (!source) return null;

    return this.prisma.hint.create({
      data: {
        workspaceId: source.workspaceId,
        source: 'EXTERNAL_ARCHIVE',
        entityType: 'source',
        entityId: sourceId,
        targetEntityType: personId ? 'person' : null,
        targetEntityId: personId ?? null,
        title: `Внешний архив: ${record.title}`,
        summary: record.attributionText,
        score: 0.75,
        metadata: {
          externalProvider: record.provider,
          externalRecordId: record.id,
          recordUrl: record.url ?? null,
        },
        reasons: {
          create: [
            {
              code: 'external_archive.import',
              label: 'Импортированная запись внешнего архива',
              weight: 1,
              detail: {
                provider: record.provider,
                recordId: record.id,
              },
            },
          ],
        },
      },
    });
  }
}
