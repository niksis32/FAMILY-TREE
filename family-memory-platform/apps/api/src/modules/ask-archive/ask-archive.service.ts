import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AskArchiveAnswerDto, AskArchiveCitationDto } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { AiService } from '../ai/ai.service';
import { SearchService } from '../search/search.service';
import type { AskArchiveDto } from './ask-archive.dto';

@Injectable()
export class AskArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly search: SearchService,
    private readonly ai: AiService,
    private readonly config: ConfigService,
  ) {}

  async ask(dto: AskArchiveDto, userId: string): Promise<AskArchiveAnswerDto> {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    const query = dto.question.trim();
    const language = dto.language ?? 'ru';
    const citations: AskArchiveCitationDto[] = [];

    if (workspaceId) {
      const searchHits = await this.search.facetedSearch(
        {
          q: query,
          categories: (dto.categories as never) ?? undefined,
          limit: dto.limit ?? 8,
        },
        { id: userId, email: '', role: 'VIEWER' },
      );

      for (const hit of searchHits.hits ?? []) {
        if (hit.privacyLevel === 'private') continue;
        citations.push({
          sourceType: this.mapCategory(hit.category),
          entityId: hit.entityId ?? hit.id,
          title: hit.title ?? hit.id,
          excerpt: (hit.text ?? '').slice(0, 240),
          deepLink: this.deepLink(hit.category, hit.entityId ?? hit.id),
          confidence: 0.75,
        });
      }
    }

    const structured = await this.fetchStructuredSources(query, workspaceId);
    citations.push(...structured);

    const uniqueCitations = this.dedupeCitations(citations).slice(0, dto.limit ?? 8);
    const hasSources = uniqueCitations.length > 0;

    let answer: string;
    let usedLlm = false;

    if (hasSources && this.config.get<string>('AI_SERVICE_ENABLED') === 'true') {
      const llmResult = await this.ai.askArchiveNarrative(
        {
          question: query,
          language,
          citations: uniqueCitations.map((c) => ({
            sourceType: c.sourceType,
            entityId: c.entityId,
            title: c.title,
            excerpt: c.excerpt,
            deepLink: c.deepLink,
            confidence: c.confidence,
          })),
        },
        { userId, workspaceId },
      );
      const data = this.ai.extractData<{ ok?: boolean; answer?: string }>(llmResult);
      if (data?.answer?.trim()) {
        answer = data.answer.trim();
        usedLlm = Boolean(data.ok);
      } else {
        answer = this.buildAnswerFromCitations(query, uniqueCitations, language);
      }
    } else {
      answer = hasSources
        ? this.buildAnswerFromCitations(query, uniqueCitations, language)
        : language === 'en'
          ? 'No matching archive sources found in your workspace (privacy filters applied). Try rephrasing or upload more documents/memories.'
          : 'В workspace не найдено подходящих источников архива (с учётом privacy). Переформулируйте вопрос или загрузите документы/воспоминания.';
    }

    return {
      answer,
      citations: uniqueCitations,
      assumptions: hasSources
        ? [
            usedLlm
              ? 'Answer synthesized via local LLM from retrieved citations — verify against originals.'
              : 'Answer synthesized from keyword/structured retrieval — not a verified genealogical conclusion.',
          ]
        : ['No sources matched — answer is generic guidance only.'],
      uncertaintyScore: hasSources ? (usedLlm ? 0.28 : 0.35) : 0.85,
      privacyRedacted: true,
    };
  }

  private async fetchStructuredSources(query: string, workspaceId?: string): Promise<AskArchiveCitationDto[]> {
    if (!workspaceId) return [];
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (!tokens.length) return [];

    const persons = await this.prisma.person.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        privacyLevel: { not: 'PRIVATE' },
        OR: tokens.flatMap((t) => [
          { givenName: { contains: t, mode: 'insensitive' as const } },
          { familyName: { contains: t, mode: 'insensitive' as const } },
        ]),
      },
      take: 3,
    });

    return persons.map((p) => ({
      sourceType: 'person' as const,
      entityId: p.id,
      title: `${p.familyName ?? ''} ${p.givenName}`.trim(),
      excerpt: (p.biography ?? '').slice(0, 200) || 'Person record',
      deepLink: `/persons/${p.id}`,
      confidence: 0.65,
    }));
  }

  private buildAnswerFromCitations(
    question: string,
    citations: AskArchiveCitationDto[],
    language: string,
  ): string {
    const intro =
      language === 'en'
        ? `Based on ${citations.length} source(s) in your family archive regarding «${question}»:`
        : `На основании ${citations.length} источник(ов) семейного архива по запросу «${question}»:`;

    const bullets = citations
      .map((c, i) => `${i + 1}. ${c.title}: ${c.excerpt || '—'} [source: ${c.sourceType}/${c.entityId}]`)
      .join('\n');

    const footer =
      language === 'en'
        ? '\n\n[uncertainty] Verify dates and relationships against original documents. Living persons may be redacted.'
        : '\n\n[uncertainty] Проверьте даты и связи по оригинальным документам. Данные living persons могут быть скрыты.';

    return `${intro}\n${bullets}${footer}`;
  }

  private mapCategory(category: string): AskArchiveCitationDto['sourceType'] {
    if (category === 'documents') return 'document';
    if (category === 'memories') return 'memory';
    if (category === 'wiki') return 'wiki';
    if (category === 'people') return 'person';
    if (category === 'evidence') return 'citation';
    return 'document';
  }

  private deepLink(category: string, entityId: string): string {
    if (category === 'documents') return `/documents/${entityId}/intelligence`;
    if (category === 'memories') return `/memories/${entityId}`;
    if (category === 'wiki') return `/wiki/${entityId}`;
    if (category === 'people') return `/persons/${entityId}`;
    return `/search?q=${encodeURIComponent(entityId)}`;
  }

  private dedupeCitations(items: AskArchiveCitationDto[]): AskArchiveCitationDto[] {
    const seen = new Set<string>();
    return items.filter((c) => {
      const key = `${c.sourceType}:${c.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
