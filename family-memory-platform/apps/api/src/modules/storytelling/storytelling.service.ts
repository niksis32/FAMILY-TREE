import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiStoryDraftStatus, AiStoryMode, AiStoryType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import { FamiliesService } from '../families/families.service';
import { MapService } from '../map/map.service';
import { PersonsService } from '../persons/persons.service';
import { TimelineService } from '../timeline/timeline.service';
import type {
  StoryClaim,
  StoryDraftDto,
  StoryParagraph,
  StorySourceRef,
  StoryTypeId,
} from '@family/shared';
import { toStoryDraftDto } from './storytelling.mapper';
import { normalizeLanguage, normalizeMode } from './storytelling.dto';

type StoryAiResult = {
  narrative?: string;
  paragraphs?: StoryParagraph[];
  claims?: StoryClaim[];
  warnings?: StoryDraftDto['warnings'];
  uncertaintyScore?: number;
  sources?: StorySourceRef[];
  status?: string;
  feature?: string;
  message?: string;
};

@Injectable()
export class StorytellingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly persons: PersonsService,
    private readonly families: FamiliesService,
    private readonly map: MapService,
    private readonly timeline: TimelineService,
    private readonly documents: DocumentsService,
  ) {}

  async getDraftOwned(id: string, userId: string) {
    const draft = await this.prisma.aiStoryDraft.findFirst({
      where: { id, createdById: userId, deletedAt: null },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    return draft;
  }

  async getDraftDtoOwned(id: string, userId: string) {
    return toStoryDraftDto(await this.getDraftOwned(id, userId));
  }

  async updateDraftOwned(id: string, userId: string, patch: { narrative?: string; paragraphs?: unknown }) {
    const draft = await this.getDraftOwned(id, userId);
    const payload = (draft.payloadJson && typeof draft.payloadJson === 'object' ? (draft.payloadJson as any) : {}) as Record<
      string,
      unknown
    >;
    if (typeof patch.narrative === 'string') payload.narrative = patch.narrative;
    if (patch.paragraphs !== undefined) payload.paragraphs = patch.paragraphs;

    const updated = await this.prisma.aiStoryDraft.update({
      where: { id },
      data: {
        narrativeText: typeof patch.narrative === 'string' ? patch.narrative : draft.narrativeText,
        payloadJson: toInputJsonValue(payload),
      },
    });
    return toStoryDraftDto(updated);
  }

  async listDraftsOwned(
    userId: string,
    filter?: {
      type?: string;
      personId?: string;
      familyId?: string;
      documentId?: string;
      q?: string;
    },
  ) {
    const type = typeof filter?.type === 'string' ? filter.type : undefined;
    const q = typeof filter?.q === 'string' ? filter.q.trim() : '';
    const storyType = type ? parseStoryType(type) : undefined;

    const rows = await this.prisma.aiStoryDraft.findMany({
      where: {
        createdById: userId,
        deletedAt: null,
        storyType: storyType ? storyType : undefined,
        scopePersonId: filter?.personId || undefined,
        scopeFamilyId: filter?.familyId || undefined,
        scopeDocumentId: filter?.documentId || undefined,
        OR: q
          ? [
              { title: { contains: q, mode: 'insensitive' } },
              { narrativeText: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return rows.map(toStoryDraftDto);
  }

  async removeDraftOwned(id: string, userId: string) {
    await this.getDraftOwned(id, userId);
    await this.prisma.aiStoryDraft.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async generatePersonStory(userId: string, personId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    const person = await this.persons.findOne(personId);
    const timeline = await this.timeline.getPersonTimeline(personId);

    const aiResult = await this.ai.storyPerson({
      language,
      mode,
      person: {
        id: person.id,
        givenName: person.givenName,
        patronymic: person.patronymic,
        familyName: person.familyName,
        birthDate: person.birthDate ? new Date(person.birthDate).toISOString() : null,
        deathDate: person.deathDate ? new Date(person.deathDate).toISOString() : null,
        isLiving: person.isLiving,
        biography: person.biography,
      },
      timeline: timeline.events.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        dateFrom: e.dateFrom,
        dateTo: e.dateTo,
        place: e.place,
      })),
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'person',
      mode,
      language,
      title: `${person.givenName}${person.familyName ? ` ${person.familyName}` : ''}`.trim() || 'Biography',
      scopePersonId: personId,
      aiData: data,
    });
  }

  async generateTimelineNarrative(userId: string, personId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const timeline = await this.timeline.getPersonTimeline(personId);

    const aiResult = await this.ai.storyTimelineNarrative({
      language,
      mode,
      person: { id: personId, name: timeline.personName },
      timeline: timeline.events.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        dateFrom: e.dateFrom,
        dateTo: e.dateTo,
        place: e.place,
      })),
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'timeline_narrative',
      mode,
      language,
      title: `Timeline: ${timeline.personName}`,
      scopePersonId: personId,
      aiData: data,
    });
  }

  async generateDocumentSummary(userId: string, documentId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const doc = await this.documents.findOne(documentId);

    const aiResult = await this.ai.storyDocumentSummary({
      language,
      mode,
      document: {
        id: doc.id,
        title: doc.title,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
        description: doc.description,
        ocrText: doc.ocrText ?? '',
        personId: doc.personId,
        sourceId: doc.sourceId,
      },
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'document_summary',
      mode,
      language,
      title: `Document: ${doc.title}`,
      scopePersonId: doc.personId ?? undefined,
      scopeDocumentId: documentId,
      aiData: data,
    });
  }

  async generateFamilyStory(userId: string, familyId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const family = await this.families.findOne(familyId);
    const persons = family.members.map((m) => m.person);

    const aiResult = await this.ai.storyFamily({
      language,
      mode,
      family: { id: family.id, name: family.name, notes: family.notes },
      persons: persons.map((p) => ({
        id: p.id,
        givenName: p.givenName,
        patronymic: p.patronymic,
        familyName: p.familyName,
        birthDate: p.birthDate?.toISOString?.() ?? (p.birthDate ? new Date(p.birthDate).toISOString() : null),
        deathDate: p.deathDate?.toISOString?.() ?? (p.deathDate ? new Date(p.deathDate).toISOString() : null),
        isLiving: p.isLiving,
        biography: p.biography,
      })),
      events: family.events.map((e) => ({
        id: e.id,
        type: e.type,
        title: eventTitleFromPrismaEvent(e),
        description: e.description,
        date: e.date ? new Date(e.date).toISOString() : null,
        placeId: e.placeId,
      })),
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'family',
      mode,
      language,
      title: `Family: ${family.name ?? family.id}`,
      scopeFamilyId: familyId,
      aiData: data,
    });
  }

  async generateMigrationStory(
    userId: string,
    scope: { personId?: string; familyId?: string; personIds?: string[] },
    opts?: { mode?: string; language?: string },
  ) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    const personIds: string[] = Array.isArray(scope.personIds) ? scope.personIds.slice(0, 500) : [];
    if (scope.personId) personIds.push(scope.personId);
    if (scope.familyId) {
      const family = await this.families.findOne(scope.familyId);
      for (const m of family.members) personIds.push(m.personId);
    }
    const uniquePersonIds = [...new Set(personIds)].filter(Boolean);

    const mapPayload =
      uniquePersonIds.length > 0
        ? await this.map.getMigrationPath({ personIds: uniquePersonIds, yearFrom: undefined, yearTo: undefined })
        : { places: [], routes: [], events: [], meta: { sourceType: 'migration-path', sourceId: 'none' } };

    const aiResult = await this.ai.storyMigration({
      language,
      mode,
      personIds: uniquePersonIds,
      familyId: scope.familyId ?? null,
      map: mapPayload,
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'migration',
      mode,
      language,
      title: scope.familyId ? `Migration: family ${scope.familyId}` : `Migration: person ${scope.personId ?? '—'}`,
      scopePersonId: scope.personId,
      scopeFamilyId: scope.familyId,
      aiData: data,
    });
  }

  async generateEraContext(
    userId: string,
    scope: { personId?: string; familyId?: string; yearFrom?: number; yearTo?: number },
    opts?: { mode?: string; language?: string },
  ) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    let yearFrom = scope.yearFrom ?? null;
    let yearTo = scope.yearTo ?? null;
    if ((!yearFrom || !yearTo) && scope.personId) {
      const timeline = await this.timeline.getPersonTimeline(scope.personId);
      const years = timeline.events
        .map((e) => (e.sortDate ? Number(String(e.sortDate).slice(0, 4)) : NaN))
        .filter((y) => Number.isFinite(y));
      if (years.length) {
        yearFrom = yearFrom ?? Math.min(...years);
        yearTo = yearTo ?? Math.max(...years);
      }
    }

    const aiResult = await this.ai.storyEraContext({
      language,
      mode,
      personId: scope.personId ?? null,
      familyId: scope.familyId ?? null,
      yearFrom,
      yearTo,
    });

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    return this.persistDraft({
      userId,
      storyType: 'era_context',
      mode,
      language,
      title: `Era context${yearFrom ? `: ${yearFrom}` : ''}${yearTo ? `–${yearTo}` : ''}`,
      scopePersonId: scope.personId,
      scopeFamilyId: scope.familyId,
      aiData: data,
    });
  }

  private async persistDraft(params: {
    userId: string;
    storyType: StoryTypeId;
    mode: ReturnType<typeof normalizeMode>;
    language: string;
    title: string;
    scopePersonId?: string;
    scopeFamilyId?: string;
    scopeDocumentId?: string;
    status?: AiStoryDraftStatus;
    aiData: StoryAiResult;
  }): Promise<StoryDraftDto> {
    const { storyType, mode } = params;
    const prismaStoryType = toPrismaStoryType(storyType);
    const prismaMode = toPrismaMode(mode);
    const payload = {
      narrative: typeof params.aiData.narrative === 'string' ? params.aiData.narrative : '',
      paragraphs: Array.isArray(params.aiData.paragraphs) ? params.aiData.paragraphs : [],
      claims: Array.isArray(params.aiData.claims) ? params.aiData.claims : [],
      warnings: Array.isArray(params.aiData.warnings) ? params.aiData.warnings : [],
      service: {
        status: params.aiData.status ?? 'unknown',
        feature: params.aiData.feature ?? null,
        message: params.aiData.message ?? null,
      },
    };

    const draft = await this.prisma.aiStoryDraft.create({
      data: {
        createdById: params.userId,
        workspaceId: null,
        storyType: prismaStoryType,
        mode: prismaMode,
        status: params.status ?? 'DRAFT',
        language: params.language,
        title: params.title,
        scopePersonId: params.scopePersonId,
        scopeFamilyId: params.scopeFamilyId,
        scopeDocumentId: params.scopeDocumentId,
        narrativeText: payload.narrative,
        payloadJson: toInputJsonValue(payload),
        uncertaintyScore: typeof params.aiData.uncertaintyScore === 'number' ? params.aiData.uncertaintyScore : null,
      },
    });
    return toStoryDraftDto(draft);
  }
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  // Prisma JSON types disallow `undefined` and require plain JSON values.
  // Stringify/parse is a pragmatic guardrail: it strips undefined and non-JSON types early.
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function eventTitleFromPrismaEvent(e: { type: unknown; date?: Date | null; description?: string | null }): string {
  const type = typeof e.type === 'string' ? e.type : 'EVENT';
  const datePrefix =
    e.date instanceof Date && !Number.isNaN(e.date.valueOf()) ? `${e.date.toISOString().slice(0, 10)} ` : '';
  const desc = typeof e.description === 'string' ? e.description.trim() : '';
  const descShort = desc ? desc.slice(0, 80) : '';
  return `${datePrefix}${type}${descShort ? ` — ${descShort}` : ''}`.trim();
}

function isStoryTypeId(v: string): v is StoryTypeId {
  return (
    v === 'person' ||
    v === 'family' ||
    v === 'migration' ||
    v === 'document_summary' ||
    v === 'timeline_narrative' ||
    v === 'era_context'
  );
}

function parseStoryType(input: string): AiStoryType | undefined {
  const v = String(input || '').trim().toLowerCase();
  if (!v) return undefined;
  if (!isStoryTypeId(v)) return undefined;
  switch (v) {
    case 'person':
      return 'PERSON';
    case 'family':
      return 'FAMILY';
    case 'migration':
      return 'MIGRATION';
    case 'document_summary':
      return 'DOCUMENT_SUMMARY';
    case 'timeline_narrative':
      return 'TIMELINE_NARRATIVE';
    case 'era_context':
      return 'ERA_CONTEXT';
    default:
      return undefined;
  }
}

function toPrismaStoryType(v: StoryTypeId): AiStoryType {
  switch (v) {
    case 'person':
      return 'PERSON';
    case 'family':
      return 'FAMILY';
    case 'migration':
      return 'MIGRATION';
    case 'document_summary':
      return 'DOCUMENT_SUMMARY';
    case 'timeline_narrative':
      return 'TIMELINE_NARRATIVE';
    case 'era_context':
      return 'ERA_CONTEXT';
    default:
      return 'PERSON';
  }
}

function toPrismaMode(v: ReturnType<typeof normalizeMode>): AiStoryMode {
  switch (v) {
    case 'dry_biography':
      return 'DRY_BIOGRAPHY';
    case 'artistic':
      return 'ARTISTIC';
    case 'archive':
      return 'ARCHIVE';
    case 'family_book':
      return 'FAMILY_BOOK';
    default:
      return 'DRY_BIOGRAPHY';
  }
}

