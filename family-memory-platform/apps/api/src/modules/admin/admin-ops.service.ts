import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DOCUMENT_OCR_QUEUE,
  LIVING_PERSON_RECALC_QUEUE,
  MATCHING_QUEUE,
  PHOTO_ANALYSIS_QUEUE,
  WORKSPACE_EXPORT_QUEUE,
} from '@family/shared';
import { Queue } from 'bullmq';
import type { AdminOpsOverview } from '@family/shared';
import { OpsErrorLogService } from '../../common/filters/ops-error-log.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

const QUEUE_NAMES = [
  DOCUMENT_OCR_QUEUE,
  PHOTO_ANALYSIS_QUEUE,
  MATCHING_QUEUE,
  WORKSPACE_EXPORT_QUEUE,
  LIVING_PERSON_RECALC_QUEUE,
] as const;

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly minio: MinioStorageService,
    private readonly config: ConfigService,
    private readonly opsErrors: OpsErrorLogService,
  ) {}

  async getOverview(): Promise<AdminOpsOverview> {
    const [database, redisCheck, minio, meilisearch, queues, recentErrors] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinio(),
      this.checkMeilisearch(),
      this.collectQueueStats(),
      this.opsErrors.listRecent(30),
    ]);

    return {
      timestamp: new Date().toISOString(),
      health: { database, redis: redisCheck, minio, meilisearch },
      queues,
      recentErrors: recentErrors.map((row: {
        id: string;
        requestId: string | null;
        statusCode: number;
        method: string | null;
        path: string | null;
        message: string;
        createdAt: Date;
      }) => ({
        id: row.id,
        requestId: row.requestId,
        statusCode: row.statusCode,
        method: row.method,
        path: row.path,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async checkDatabase() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Database unreachable',
      };
    }
  }

  private async checkRedis() {
    const started = Date.now();
    const client = this.redis.getConnection();
    if (!client) {
      return { ok: false, error: 'REDIS_URL is not configured' };
    }
    try {
      const pong = await client.ping();
      return { ok: pong === 'PONG', latencyMs: Date.now() - started, details: { pong } };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Redis unreachable',
      };
    }
  }

  private async checkMinio() {
    const started = Date.now();
    const result = await this.minio.checkHealth();
    return { ...result, latencyMs: Date.now() - started };
  }

  private async checkMeilisearch() {
    const started = Date.now();
    const host = this.config.get<string>('MEILI_HOST') ?? 'http://localhost:7700';
    const key = this.config.get<string>('MEILI_MASTER_KEY');
    if (!key) {
      return { ok: false, error: 'MEILI_MASTER_KEY is not configured' };
    }
    try {
      const response = await fetch(`${host}/health`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const body = response.ok ? await response.json().catch(() => ({})) : undefined;
      return {
        ok: response.ok,
        latencyMs: Date.now() - started,
        details: body as Record<string, unknown> | undefined,
        error: response.ok ? undefined : `Meilisearch ${response.status}`,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Meilisearch unreachable',
      };
    }
  }

  private async collectQueueStats() {
    const url = this.redis.getUrl();
    if (!url) {
      return QUEUE_NAMES.map((name) => ({
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        error: 'REDIS_URL not configured',
      }));
    }

    const results = [];
    for (const name of QUEUE_NAMES) {
      const queue = new Queue(name, { connection: { url } });
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        results.push({
          name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        });
      } catch (error) {
        results.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          error: error instanceof Error ? error.message : 'Queue stats unavailable',
        });
      } finally {
        await queue.close();
      }
    }
    return results;
  }
}
