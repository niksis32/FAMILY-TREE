import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiStoryDraftStatus, AiStoryMode, AiStoryType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService, type AiRequestAudit } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import { FamiliesService } from '../families/families.service';
import { MapService } from '../map/map.service';
import { PersonsService } from '../persons/persons.service';
import { TimelineService } from '../timeline/timeline.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type {
  StoryClaim,
  StoryDraftDto,
  StoryParagraph,
  StorySourceRef,
  StoryTypeId,
} from '@family/shared';
import { toStoryDraftDto } from './storytelling.mapper';
import { normalizeLanguage, normalizeMode } from './storytelling.dto';
import {
  StoryFactCheckService,
  type EventFactRecord,
  type PersonFactRecord,
  type StoryFactCheckResult,
} from './story-fact-check.service';

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
  factCheck?: StoryFactCheckResult;
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
    private readonly factCheck: StoryFactCheckService,
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

  async generatePersonStory(user: AuthenticatedUser, personId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    const person = await this.persons.findOne(personId, user);
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
    }, this.aiAudit(user, { personId }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const enriched = this.enrichWithFactCheck(data, {
      persons: [this.toPersonFactRecord(person)],
      events: timeline.events.map((e) => this.toEventFactRecord(e)),
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'person',
      mode,
      language,
      title: `${person.givenName}${person.familyName ? ` ${person.familyName}` : ''}`.trim() || 'Biography',
      scopePersonId: personId,
      aiData: enriched,
    });
  }

  async factCheckDraftOwned(id: string, user: AuthenticatedUser) {
    const draft = await this.getDraftOwned(id, user.id);
    const payload =
      draft.payloadJson && typeof draft.payloadJson === 'object' ? (draft.payloadJson as Record<string, unknown>) : {};
    const narrative =
      typeof payload.narrative === 'string'
        ? payload.narrative
        : typeof draft.narrativeText === 'string'
          ? draft.narrativeText
          : '';

    const context = await this.buildFactCheckContext(user, {
      scopePersonId: draft.scopePersonId,
      scopeFamilyId: draft.scopeFamilyId,
      scopeDocumentId: draft.scopeDocumentId,
    });
    const factCheck = this.factCheck.checkNarrative(narrative, context);
    const aiData: StoryAiResult = {
      narrative,
      paragraphs: Array.isArray(payload.paragraphs) ? (payload.paragraphs as StoryParagraph[]) : [],
      claims: Array.isArray(payload.claims) ? (payload.claims as StoryClaim[]) : [],
      warnings: Array.isArray(payload.warnings) ? (payload.warnings as StoryDraftDto['warnings']) : [],
      uncertaintyScore: typeof draft.uncertaintyScore === 'number' ? draft.uncertaintyScore : undefined,
      status: typeof (payload.service as any)?.status === 'string' ? (payload.service as any).status : undefined,
      feature: typeof (payload.service as any)?.feature === 'string' ? (payload.service as any).feature : undefined,
      message: typeof (payload.service as any)?.message === 'string' ? (payload.service as any).message : undefined,
    };
    const enriched = this.factCheck.mergeAiDataWithFactCheck(aiData, factCheck);

    const nextPayload = {
      ...payload,
      narrative: enriched.narrative ?? narrative,
      paragraphs: enriched.paragraphs ?? [],
      claims: enriched.claims ?? [],
      warnings: enriched.warnings ?? [],
      service: {
        ...(payload.service && typeof payload.service === 'object' ? (payload.service as Record<string, unknown>) : {}),
        status: enriched.status ?? (payload.service as any)?.status ?? 'unknown',
        feature: enriched.feature ?? (payload.service as any)?.feature ?? null,
        message: enriched.message ?? (payload.service as any)?.message ?? null,
        factCheck: {
          score: factCheck.score,
          passed: factCheck.passed,
          checkedAt: new Date().toISOString(),
          issues: factCheck.issues,
        },
      },
    };

    const updated = await this.prisma.aiStoryDraft.update({
      where: { id },
      data: {
        payloadJson: toInputJsonValue(nextPayload),
        uncertaintyScore: typeof enriched.uncertaintyScore === 'number' ? enriched.uncertaintyScore : draft.uncertaintyScore,
      },
    });
    return toStoryDraftDto(updated);
  }

  async generateTimelineNarrative(user: AuthenticatedUser, personId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const person = await this.persons.findOne(personId, user);
    const personName = this.personDisplayName(person);
    const timeline = await this.timeline.getPersonTimeline(personId);

    const aiResult = await this.ai.storyTimelineNarrative({
      language,
      mode,
      person: { id: personId, name: personName },
      timeline: timeline.events.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        dateFrom: e.dateFrom,
        dateTo: e.dateTo,
        place: e.place,
      })),
    }, this.aiAudit(user, { personId }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const enriched = this.enrichWithFactCheck(data, {
      persons: [this.toPersonFactRecord(person)],
      events: timeline.events.map((e) => this.toEventFactRecord(e)),
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'timeline_narrative',
      mode,
      language,
      title: `Timeline: ${personName}`,
      scopePersonId: personId,
      aiData: enriched,
    });
  }

  async generateDocumentSummary(user: AuthenticatedUser, documentId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const doc = await this.documents.findOne(documentId, user);
    const linkedPerson = doc.personId
      ? await this.tryLoadPerson(user, doc.personId)
      : null;

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
    }, this.aiAudit(user, { documentId: doc.id }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const enriched = this.enrichWithFactCheck(data, {
      persons: linkedPerson ? [this.toPersonFactRecord(linkedPerson)] : [],
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'document_summary',
      mode,
      language,
      title: `Document: ${doc.title}`,
      scopePersonId: doc.personId ?? undefined,
      scopeDocumentId: documentId,
      aiData: enriched,
    });
  }

  async generateFamilyStory(user: AuthenticatedUser, familyId: string, opts?: { mode?: string; language?: string }) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);
    const family = await this.families.findOne(familyId);
    const persons = await this.loadVisibleFamilyPersons(user, family.members.map((m) => m.personId));

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
    }, this.aiAudit(user, { familyId }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const enriched = this.enrichWithFactCheck(data, {
      persons: persons.map((p) => this.toPersonFactRecord(p)),
      events: family.events.map((e) => ({
        id: e.id,
        title: eventTitleFromPrismaEvent(e),
        type: String(e.type),
        date: e.date ? new Date(e.date).toISOString() : null,
      })),
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'family',
      mode,
      language,
      title: `Family: ${family.name ?? family.id}`,
      scopeFamilyId: familyId,
      aiData: enriched,
    });
  }

  async generateMigrationStory(
    user: AuthenticatedUser,
    scope: { personId?: string; familyId?: string; personIds?: string[] },
    opts?: { mode?: string; language?: string },
  ) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    if (scope.personId) {
      await this.persons.findOne(scope.personId, user);
    }

    const personIds: string[] = Array.isArray(scope.personIds) ? scope.personIds.slice(0, 500) : [];
    if (scope.personId) personIds.push(scope.personId);
    if (scope.familyId) {
      const family = await this.families.findOne(scope.familyId);
      for (const m of family.members) personIds.push(m.personId);
    }
    const uniquePersonIds = [...new Set(personIds)].filter(Boolean);
    const visiblePersonIds = await this.filterVisiblePersonIds(user, uniquePersonIds);

    const mapPayload =
      visiblePersonIds.length > 0
        ? await this.map.getMigrationPath({ personIds: visiblePersonIds, yearFrom: undefined, yearTo: undefined })
        : { places: [], routes: [], events: [], meta: { sourceType: 'migration-path', sourceId: 'none' } };

    const aiResult = await this.ai.storyMigration({
      language,
      mode,
      personIds: visiblePersonIds,
      familyId: scope.familyId ?? null,
      map: mapPayload,
    }, this.aiAudit(user, { familyId: scope.familyId, personId: scope.personId }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const persons = await Promise.all(
      visiblePersonIds.slice(0, 50).map((pid) => this.tryLoadPerson(user, pid)),
    );
    const enriched = this.enrichWithFactCheck(data, {
      persons: persons.filter(Boolean).map((p) => this.toPersonFactRecord(p!)),
      events: Array.isArray((mapPayload as any).events)
        ? ((mapPayload as any).events as EventFactRecord[])
        : [],
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'migration',
      mode,
      language,
      title: scope.familyId ? `Migration: family ${scope.familyId}` : `Migration: person ${scope.personId ?? '—'}`,
      scopePersonId: scope.personId,
      scopeFamilyId: scope.familyId,
      aiData: enriched,
    });
  }

  async generateEraContext(
    user: AuthenticatedUser,
    scope: { personId?: string; familyId?: string; yearFrom?: number; yearTo?: number },
    opts?: { mode?: string; language?: string },
  ) {
    const language = normalizeLanguage(opts?.language);
    const mode = normalizeMode(opts?.mode);

    let yearFrom = scope.yearFrom ?? null;
    let yearTo = scope.yearTo ?? null;
    let timelineEvents: EventFactRecord[] = [];
    let personRecord: PersonFactRecord | null = null;
    if ((!yearFrom || !yearTo) && scope.personId) {
      const person = await this.persons.findOne(scope.personId, user);
      personRecord = this.toPersonFactRecord(person);
      const timeline = await this.timeline.getPersonTimeline(scope.personId);
      timelineEvents = timeline.events.map((e) => this.toEventFactRecord(e));
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
    }, this.aiAudit(user, { personId: scope.personId, familyId: scope.familyId }));

    const data = this.ai.extractData<StoryAiResult>(aiResult) ?? {};
    const enriched = this.enrichWithFactCheck(data, {
      persons: personRecord ? [personRecord] : [],
      events: timelineEvents,
    });
    return this.persistDraft({
      userId: user.id,
      storyType: 'era_context',
      mode,
      language,
      title: `Era context${yearFrom ? `: ${yearFrom}` : ''}${yearTo ? `–${yearTo}` : ''}`,
      scopePersonId: scope.personId,
      scopeFamilyId: scope.familyId,
      aiData: enriched,
    });
  }

  private aiAudit(user: AuthenticatedUser, scope?: Record<string, string | undefined>): AiRequestAudit {
    const filtered: Record<string, string> = {};
    if (scope) {
      for (const [key, value] of Object.entries(scope)) {
        if (value) filtered[key] = value;
      }
    }
    return {
      userId: user.id,
      scope: Object.keys(filtered).length ? filtered : undefined,
    };
  }

  private enrichWithFactCheck(
    aiData: StoryAiResult,
    context: { persons?: PersonFactRecord[]; events?: EventFactRecord[] },
  ): StoryAiResult {
    const narrative = typeof aiData.narrative === 'string' ? aiData.narrative : '';
    const factCheck = this.factCheck.checkNarrative(narrative, context);
    return this.factCheck.mergeAiDataWithFactCheck(aiData, factCheck) as StoryAiResult;
  }

  private async buildFactCheckContext(
    user: AuthenticatedUser,
    scope: {
      scopePersonId?: string | null;
      scopeFamilyId?: string | null;
      scopeDocumentId?: string | null;
    },
  ) {
    const persons: PersonFactRecord[] = [];
    const events: EventFactRecord[] = [];

    if (scope.scopePersonId) {
      const person = await this.tryLoadPerson(user, scope.scopePersonId);
      if (person) {
        persons.push(this.toPersonFactRecord(person));
        const timeline = await this.timeline.getPersonTimeline(scope.scopePersonId);
        events.push(...timeline.events.map((e) => this.toEventFactRecord(e)));
      }
    }

    if (scope.scopeFamilyId) {
      try {
        const family = await this.families.findOne(scope.scopeFamilyId);
        const visiblePersons = await this.loadVisibleFamilyPersons(
          user,
          family.members.map((m) => m.personId),
        );
        persons.push(...visiblePersons.map((p) => this.toPersonFactRecord(p)));
        for (const event of family.events) {
          events.push({
            id: event.id,
            title: eventTitleFromPrismaEvent(event),
            type: String(event.type),
            date: event.date ? new Date(event.date).toISOString() : null,
          });
        }
      } catch {
        // ignore missing family
      }
    }

    if (scope.scopeDocumentId && persons.length === 0) {
      try {
        const doc = await this.documents.findOne(scope.scopeDocumentId, user);
        if (doc.personId) {
          const person = await this.tryLoadPerson(user, doc.personId);
          if (person) persons.push(this.toPersonFactRecord(person));
        }
      } catch {
        // ignore missing document/person
      }
    }

    return { persons, events };
  }

  private async tryLoadPerson(user: AuthenticatedUser, personId: string) {
    try {
      return await this.persons.findOne(personId, user);
    } catch {
      return null;
    }
  }

  private async loadVisibleFamilyPersons(user: AuthenticatedUser, personIds: string[]) {
    const persons = await Promise.all(personIds.map((id) => this.tryLoadPerson(user, id)));
    return persons.filter((p): p is NonNullable<typeof p> => p !== null);
  }

  private async filterVisiblePersonIds(user: AuthenticatedUser, personIds: string[]) {
    const checks = await Promise.all(
      personIds.map(async (id) => ((await this.tryLoadPerson(user, id)) ? id : null)),
    );
    return checks.filter((id): id is string => id !== null);
  }

  private personDisplayName(person: {
    givenName?: string | null;
    familyName?: string | null;
  }) {
    return `${person.givenName ?? ''}${person.familyName ? ` ${person.familyName}` : ''}`.trim() || 'Person';
  }

  private toPersonFactRecord(person: {
    id: string;
    givenName?: string | null;
    patronymic?: string | null;
    familyName?: string | null;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    isLiving?: boolean | null;
  }): PersonFactRecord {
    return {
      id: person.id,
      givenName: person.givenName,
      patronymic: person.patronymic,
      familyName: person.familyName,
      birthDate: person.birthDate ?? null,
      deathDate: person.deathDate ?? null,
      isLiving: person.isLiving,
    };
  }

  private toEventFactRecord(event: {
    id: string;
    title?: string | null;
    type?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    sortDate?: string | null;
  }): EventFactRecord {
    return {
      id: event.id,
      title: event.title,
      type: event.type,
      dateFrom: event.dateFrom,
      dateTo: event.dateTo,
      sortDate: event.sortDate,
    };
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
        factCheck: params.aiData.factCheck
          ? {
              score: params.aiData.factCheck.score,
              passed: params.aiData.factCheck.passed,
              checkedAt: new Date().toISOString(),
              issues: params.aiData.factCheck.issues,
            }
          : null,
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

