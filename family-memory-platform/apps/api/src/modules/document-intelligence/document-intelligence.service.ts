import { Injectable } from '@nestjs/common';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { AiService } from '../ai/ai.service';
import { CitationsService } from '../citations/citations.service';
import type { CreateCitationDto } from '../citations/citations.dto';
import { DocumentsService } from '../documents/documents.service';
import { EventsService } from '../events/events.service';
import type { CreateEventDto } from '../events/events.dto';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { RelationshipsService } from '../relationships/relationships.service';
import type { CreateRelationshipDto } from '../relationships/relationships.dto';
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

@Injectable()
export class DocumentIntelligenceService {
  /** MVP: in-process cache. Replace with Redis/DB for multi-instance. */
  private readonly cache = new Map<string, DocumentIntelligenceAnalysisEntry>();

  constructor(
    private readonly ai: AiService,
    private readonly documents: DocumentsService,
    private readonly events: EventsService,
    private readonly relationships: RelationshipsService,
    private readonly citations: CitationsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  async runOcr(dto: OcrDocumentDto) {
    const doc = await this.documents.findOne(dto.documentId);
    const presigned = await this.documents.getPresignedDownloadUrl(dto.documentId);
    const aiResult = await this.ai.documentOcr({
      documentId: doc.id,
      fileName: doc.title,
      mimeType: doc.mimeType,
      storageKey: doc.storageKey,
      downloadUrl: presigned.downloadUrl,
      language: dto.language ?? 'ru',
      textHint: doc.ocrText ?? '',
    });
    const e = this.ensureEntry(dto.documentId);
    e.ocr = this.unwrapAi(aiResult);
    e.updatedAt = new Date().toISOString();
    return aiResult;
  }

  async extractEntities(dto: ExtractEntitiesDto) {
    const doc = await this.documents.findOne(dto.documentId);
    const textBlocks = this.buildTextBlocks(dto.documentId, doc);
    const aiResult = await this.ai.documentExtractEntities({
      documentId: doc.id,
      language: dto.language ?? 'ru',
      textBlocks,
    });
    const e = this.ensureEntry(dto.documentId);
    e.entities = this.unwrapAi(aiResult);
    e.updatedAt = new Date().toISOString();
    return aiResult;
  }

  async suggestEvents(dto: SuggestEventsDto) {
    const doc = await this.documents.findOne(dto.documentId);
    const e = this.ensureEntry(dto.documentId);
    const textBlocks = this.buildTextBlocks(dto.documentId, doc);
    const entities = this.pickEntitiesPayload(e.entities);
    const aiResult = await this.ai.documentSuggestEvents({
      documentId: doc.id,
      language: dto.language ?? 'ru',
      textBlocks,
      entities,
    });
    e.events = this.unwrapAi(aiResult);
    e.updatedAt = new Date().toISOString();
    return aiResult;
  }

  async suggestRelationships(dto: SuggestRelationshipsDto) {
    const doc = await this.documents.findOne(dto.documentId);
    const e = this.ensureEntry(dto.documentId);
    const textBlocks = this.buildTextBlocks(dto.documentId, doc);
    const entities = this.pickEntitiesPayload(e.entities);
    const aiResult = await this.ai.documentSuggestRelationships({
      documentId: doc.id,
      language: dto.language ?? 'ru',
      textBlocks,
      entities,
      knownPersonIds: dto.knownPersonIds ?? [],
    });
    e.relationships = this.unwrapAi(aiResult);
    e.updatedAt = new Date().toISOString();
    return aiResult;
  }

  async summarize(dto: SummarizeDocumentDto) {
    const doc = await this.documents.findOne(dto.documentId);
    const e = this.ensureEntry(dto.documentId);
    const textBlocks = this.buildTextBlocks(dto.documentId, doc);
    const aiResult = await this.ai.documentSummarize({
      documentId: doc.id,
      language: dto.language ?? 'ru',
      textBlocks,
    });
    e.summary = this.unwrapAi(aiResult);
    e.updatedAt = new Date().toISOString();
    return aiResult;
  }

  getResults(documentId: string) {
    const e = this.cache.get(documentId);
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

  async rejectSuggestion(documentId: string, dto: RejectSuggestionDto) {
    await this.documents.findOne(documentId);
    const e = this.ensureEntry(documentId);
    e.rejected.add(`${dto.kind}:${dto.suggestionId}`);
    e.updatedAt = new Date().toISOString();
    return { ok: true, documentId, ...dto };
  }

  /** User explicitly confirms — creates event (does not auto-run from AI). */
  async confirmEvent(documentId: string, dto: CreateEventDto, userId: string) {
    await this.documents.findOne(documentId);
    const event = await this.events.create(dto);
    await this.gamification.record({
      userId,
      action: GAMIFICATION_ACTIONS.EVENT_CREATE,
      entityType: 'event',
      entityId: event.id,
    });
    return { documentId, event, source: 'document-intelligence.confirm-event' };
  }

  async confirmRelationship(documentId: string, dto: CreateRelationshipDto) {
    await this.documents.findOne(documentId);
    const relationship = await this.relationships.create(dto);
    return { documentId, relationship, source: 'document-intelligence.confirm-relationship' };
  }

  async confirmCitation(documentId: string, dto: CreateCitationDto, userId: string) {
    await this.documents.findOne(documentId);
    const citation = await this.citations.create(dto);
    await this.gamification.record({
      userId,
      action: GAMIFICATION_ACTIONS.CITATION_CREATE,
      entityType: 'citation',
      entityId: citation.id,
    });
    return { documentId, citation, source: 'document-intelligence.confirm-citation' };
  }

  private ensureEntry(documentId: string): DocumentIntelligenceAnalysisEntry {
    let e = this.cache.get(documentId);
    if (!e) {
      e = { rejected: new Set(), updatedAt: new Date().toISOString() };
      this.cache.set(documentId, e);
    }
    return e;
  }

  private unwrapAi(result: unknown): unknown {
    const extracted = this.ai.extractData(result);
    if (extracted != null) return extracted;
    return result;
  }

  private buildTextBlocks(
    documentId: string,
    doc: { ocrText?: string | null },
  ): Array<{ page: number; text: string; blockId?: string }> {
    const e = this.cache.get(documentId);
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
