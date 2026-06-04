import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DocumentIntelligenceAnalysisEntry } from './types/document-intelligence-results';

type CachedAnalysisPayload = {
  ocr?: unknown;
  entities?: unknown;
  events?: unknown;
  relationships?: unknown;
  summary?: unknown;
  rejected: string[];
  updatedAt: string;
};

@Injectable()
export class DocumentIntelligenceStoreService {
  private readonly logger = new Logger(DocumentIntelligenceStoreService.name);
  private readonly redisKeyPrefix = 'doc-intel:analysis:';
  private readonly redisTtlSeconds = 60 * 60 * 24 * 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async load(documentId: string): Promise<DocumentIntelligenceAnalysisEntry | null> {
    const cached = await this.loadFromRedis(documentId);
    if (cached) return cached;

    const row = await this.prisma.documentIntelligenceAnalysis.findUnique({
      where: { documentId },
    });
    if (!row) return null;

    const entry = this.rowToEntry(row);
    await this.saveToRedis(documentId, entry);
    return entry;
  }

  async save(documentId: string, entry: DocumentIntelligenceAnalysisEntry): Promise<void> {
    const rejected = [...entry.rejected];
    await this.prisma.documentIntelligenceAnalysis.upsert({
      where: { documentId },
      create: {
        documentId,
        ocr: this.toJsonValue(entry.ocr),
        entities: this.toJsonValue(entry.entities),
        events: this.toJsonValue(entry.events),
        relationships: this.toJsonValue(entry.relationships),
        summary: this.toJsonValue(entry.summary),
        rejected,
      },
      update: {
        ocr: this.toJsonValue(entry.ocr),
        entities: this.toJsonValue(entry.entities),
        events: this.toJsonValue(entry.events),
        relationships: this.toJsonValue(entry.relationships),
        summary: this.toJsonValue(entry.summary),
        rejected,
        updatedAt: new Date(),
      },
    });
    await this.saveToRedis(documentId, entry);
  }

  async ensure(documentId: string): Promise<DocumentIntelligenceAnalysisEntry> {
    const existing = await this.load(documentId);
    if (existing) return existing;

    const entry: DocumentIntelligenceAnalysisEntry = {
      rejected: new Set(),
      updatedAt: new Date().toISOString(),
    };
    await this.save(documentId, entry);
    return entry;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private rowToEntry(row: {
    ocr: unknown;
    entities: unknown;
    events: unknown;
    relationships: unknown;
    summary: unknown;
    rejected: unknown;
    updatedAt: Date;
  }): DocumentIntelligenceAnalysisEntry {
    return {
      ocr: row.ocr ?? undefined,
      entities: row.entities ?? undefined,
      events: row.events ?? undefined,
      relationships: row.relationships ?? undefined,
      summary: row.summary ?? undefined,
      rejected: new Set(this.parseRejected(row.rejected)),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseRejected(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private redisKey(documentId: string): string {
    return `${this.redisKeyPrefix}${documentId}`;
  }

  private entryToPayload(entry: DocumentIntelligenceAnalysisEntry): CachedAnalysisPayload {
    return {
      ocr: entry.ocr,
      entities: entry.entities,
      events: entry.events,
      relationships: entry.relationships,
      summary: entry.summary,
      rejected: [...entry.rejected],
      updatedAt: entry.updatedAt,
    };
  }

  private payloadToEntry(payload: CachedAnalysisPayload): DocumentIntelligenceAnalysisEntry {
    return {
      ocr: payload.ocr,
      entities: payload.entities,
      events: payload.events,
      relationships: payload.relationships,
      summary: payload.summary,
      rejected: new Set(payload.rejected),
      updatedAt: payload.updatedAt,
    };
  }

  private async loadFromRedis(documentId: string): Promise<DocumentIntelligenceAnalysisEntry | null> {
    const client = this.redis.getConnection();
    if (!client) return null;

    try {
      const raw = await client.get(this.redisKey(documentId));
      if (!raw) return null;
      const payload = JSON.parse(raw) as CachedAnalysisPayload;
      return this.payloadToEntry(payload);
    } catch (error) {
      this.logger.warn(
        `Redis read failed for ${documentId}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private async saveToRedis(documentId: string, entry: DocumentIntelligenceAnalysisEntry): Promise<void> {
    const client = this.redis.getConnection();
    if (!client) return;

    try {
      await client.setex(
        this.redisKey(documentId),
        this.redisTtlSeconds,
        JSON.stringify(this.entryToPayload(entry)),
      );
    } catch (error) {
      this.logger.warn(
        `Redis write failed for ${documentId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
