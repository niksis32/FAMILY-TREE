import { Injectable } from '@nestjs/common';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { AiRequestAudit } from '../ai/ai.service';
import { CitationsService } from '../citations/citations.service';
import type { CreateCitationDto } from '../citations/citations.dto';
import { DocumentsService } from '../documents/documents.service';
import { EventsService } from '../events/events.service';
import type { CreateEventDto } from '../events/events.dto';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { RelationshipsService } from '../relationships/relationships.service';
import type { CreateRelationshipDto } from '../relationships/relationships.dto';
import { AiService } from '../ai/ai.service';
import { DocumentIntelligenceOcrRunnerService } from './document-intelligence-ocr-runner.service';
import { DocumentIntelligenceStoreService } from './document-intelligence-store.service';
import type { ExtractEntitiesDto } from './dto/extract-entities.dto';
import type { OcrDocumentDto } from './dto/ocr-document.dto';
import type { RejectSuggestionDto } from './dto/reject-suggestion.dto';
import type { SuggestEventsDto } from './dto/suggest-events.dto';
import type { SuggestRelationshipsDto } from './dto/suggest-relationships.dto';
import type { SummarizeDocumentDto } from './dto/summarize-document.dto';
import type { DocumentIntelligenceAnalysisEntry } from './types/document-intelligence-results';

type OcrPagesShape = {
  pages?: Array<{ page?: number; blocks?: Array<{ blockId?: string; text: string }> }>;
};

type DocumentRow = {
  id: string;
  workspaceId: string;
  ocrText?: string | null;
};

@Injectable()
export class DocumentIntelligenceService {
  constructor(
    private readonly ai: AiService,
    private readonly documents: DocumentsService,
    private readonly events: EventsService,
    private readonly relationships: RelationshipsService,
    private readonly citations: CitationsService,
    private readonly gamification: GamificationActivityService,
    private readonly store: DocumentIntelligenceStoreService,
    private readonly ocrRunner: DocumentIntelligenceOcrRunnerService,
  ) {}

  async runOcr(user: AuthenticatedUser, dto: OcrDocumentDto) {
    const { aiResult } = await this.ocrRunner.run(dto.documentId, dto.language ?? 'ru', user);
    return aiResult;
  }

  async extractEntities(user: AuthenticatedUser, dto: ExtractEntitiesDto) {
    const doc = await this.documents.findOne(dto.documentId, user);
    const audit = this.aiAudit(user, doc);
    const textBlocks = await this.buildTextBlocks(dto.documentId, doc);
    const aiResult = await this.ai.documentExtractEntities(
      {
        documentId: doc.id,
        language: dto.language ?? 'ru',
        textBlocks,
      },
      audit,
    );
    const entry = await this.store.ensure(dto.documentId);
    entry.entities = this.unwrapAi(aiResult);
    entry.updatedAt = new Date().toISOString();
    await this.store.save(dto.documentId, entry);
    return aiResult;
  }

  async suggestEvents(user: AuthenticatedUser, dto: SuggestEventsDto) {
    const doc = await this.documents.findOne(dto.documentId, user);
    const audit = this.aiAudit(user, doc);
    const entry = await this.store.ensure(dto.documentId);
    const textBlocks = await this.buildTextBlocks(dto.documentId, doc);
    const entities = this.pickEntitiesPayload(entry.entities);
    const aiResult = await this.ai.documentSuggestEvents(
      {
        documentId: doc.id,
        language: dto.language ?? 'ru',
        textBlocks,
        entities,
      },
      audit,
    );
    entry.events = this.unwrapAi(aiResult);
    entry.updatedAt = new Date().toISOString();
    await this.store.save(dto.documentId, entry);
    return aiResult;
  }

  async suggestRelationships(user: AuthenticatedUser, dto: SuggestRelationshipsDto) {
    const doc = await this.documents.findOne(dto.documentId, user);
    const audit = this.aiAudit(user, doc);
    const entry = await this.store.ensure(dto.documentId);
    const textBlocks = await this.buildTextBlocks(dto.documentId, doc);
    const entities = this.pickEntitiesPayload(entry.entities);
    const aiResult = await this.ai.documentSuggestRelationships(
      {
        documentId: doc.id,
        language: dto.language ?? 'ru',
        textBlocks,
        entities,
        knownPersonIds: dto.knownPersonIds ?? [],
      },
      audit,
    );
    entry.relationships = this.unwrapAi(aiResult);
    entry.updatedAt = new Date().toISOString();
    await this.store.save(dto.documentId, entry);
    return aiResult;
  }

  async summarize(user: AuthenticatedUser, dto: SummarizeDocumentDto) {
    const doc = await this.documents.findOne(dto.documentId, user);
    const audit = this.aiAudit(user, doc);
    const entry = await this.store.ensure(dto.documentId);
    const textBlocks = await this.buildTextBlocks(dto.documentId, doc);
    const aiResult = await this.ai.documentSummarize(
      {
        documentId: doc.id,
        language: dto.language ?? 'ru',
        textBlocks,
      },
      audit,
    );
    entry.summary = this.unwrapAi(aiResult);
    entry.updatedAt = new Date().toISOString();
    await this.store.save(dto.documentId, entry);
    return aiResult;
  }

  async getResults(user: AuthenticatedUser, documentId: string) {
    await this.documents.findOne(documentId, user);
    const e = await this.store.load(documentId);
    if (!e) {
      return {
        documentId,
        analysis: null,
        rejected: [] as string[],
        updatedAt: null as string | null,
        message: 'No analysis run yet for this document.',
      };
    }
    return {
      documentId,
      analysis: {
        ocr: e.ocr,
        entities: this.filterRejectedEntities(e),
        events: this.filterRejectedSuggestions(e.events, 'event', e.rejected),
        relationships: this.filterRejectedSuggestions(e.relationships, 'relationship', e.rejected),
        summary: e.summary,
      },
      rejected: [...e.rejected],
      updatedAt: e.updatedAt,
    };
  }

  async rejectSuggestion(user: AuthenticatedUser, documentId: string, dto: RejectSuggestionDto) {
    await this.documents.findOne(documentId, user);
    const entry = await this.store.ensure(documentId);
    entry.rejected.add(`${dto.kind}:${dto.suggestionId}`);
    entry.updatedAt = new Date().toISOString();
    await this.store.save(documentId, entry);
    return { ok: true, documentId, ...dto };
  }

  async confirmEvent(user: AuthenticatedUser, documentId: string, dto: CreateEventDto) {
    await this.documents.findOne(documentId, user);
    const event = await this.events.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.EVENT_CREATE,
      entityType: 'event',
      entityId: event.id,
    });
    return { documentId, event, source: 'document-intelligence.confirm-event' };
  }

  async confirmRelationship(user: AuthenticatedUser, documentId: string, dto: CreateRelationshipDto) {
    await this.documents.findOne(documentId, user);
    const relationship = await this.relationships.create(dto);
    return { documentId, relationship, source: 'document-intelligence.confirm-relationship' };
  }

  async confirmCitation(user: AuthenticatedUser, documentId: string, dto: CreateCitationDto) {
    await this.documents.findOne(documentId, user);
    const citation = await this.citations.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.CITATION_CREATE,
      entityType: 'citation',
      entityId: citation.id,
    });
    return { documentId, citation, source: 'document-intelligence.confirm-citation' };
  }

  private aiAudit(user: AuthenticatedUser, doc: Pick<DocumentRow, 'id' | 'workspaceId'>): AiRequestAudit {
    return {
      userId: user.id,
      workspaceId: doc.workspaceId,
      scope: { documentId: doc.id },
    };
  }

  private unwrapAi(result: unknown): unknown {
    const extracted = this.ai.extractData(result);
    if (extracted != null) return extracted;
    return result;
  }

  private async buildTextBlocks(
    documentId: string,
    doc: { ocrText?: string | null },
  ): Promise<Array<{ page: number; text: string; blockId?: string }>> {
    const e = await this.store.load(documentId);
    const ocr = e?.ocr as OcrPagesShape | undefined;
    if (ocr?.pages?.length) {
      const blocks: Array<{ page: number; text: string; blockId?: string }> = [];
      for (const p of ocr.pages) {
        const pageNum = p.page ?? 1;
        for (const b of p.blocks ?? []) {
          if (b.text) blocks.push({ page: pageNum, text: b.text, blockId: b.blockId });
        }
      }
      if (blocks.length) return blocks;
    }
    if (doc.ocrText?.trim()) {
      return [{ page: 1, text: doc.ocrText, blockId: 'db-ocr' }];
    }
    return [{ page: 1, text: '', blockId: 'empty' }];
  }

  private pickEntitiesPayload(entities: unknown): Array<Record<string, unknown>> {
    if (entities && typeof entities === 'object' && 'entities' in entities) {
      const list = (entities as { entities?: unknown }).entities;
      if (Array.isArray(list)) return list as Array<Record<string, unknown>>;
    }
    return [];
  }

  private filterRejectedEntities(e: DocumentIntelligenceAnalysisEntry): unknown {
    const raw = e.entities;
    if (!raw || typeof raw !== 'object' || !('entities' in raw)) return raw;
    const list = (raw as { entities: Array<{ suggestionId?: string; id?: string }> }).entities;
    if (!Array.isArray(list)) return raw;
    const next = list.filter((item) => {
      const sid = item.suggestionId ?? item.id;
      if (!sid) return true;
      return !e.rejected.has(`entity:${sid}`);
    });
    return { ...(raw as object), entities: next };
  }

  private filterRejectedSuggestions(
    raw: unknown,
    kind: 'event' | 'relationship',
    rejected: Set<string>,
  ): unknown {
    if (!raw || typeof raw !== 'object' || !('suggestions' in raw)) return raw;
    const list = (raw as { suggestions: Array<{ suggestionId?: string; id?: string }> }).suggestions;
    if (!Array.isArray(list)) return raw;
    const prefix = `${kind}:`;
    const next = list.filter((item) => {
      const sid = item.suggestionId ?? item.id;
      if (!sid) return true;
      return !rejected.has(`${prefix}${sid}`);
    });
    return { ...(raw as object), suggestions: next };
  }
}
