import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioStorageService } from '../storage/minio-storage.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeepHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly minio: MinioStorageService,
    private readonly config: ConfigService,
  ) {}

  async checkAll() {
    const [database, redis, minio, meilisearch] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinio(),
      this.checkMeilisearch(),
    ]);
    const ok = database.ok && redis.ok && minio.ok && meilisearch.ok;
    return {
      status: ok ? 'ok' : 'degraded',
      service: 'family-api',
      timestamp: new Date().toISOString(),
      checks: { database, redis, minio, meilisearch },
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
    if (!client) return { ok: false, error: 'REDIS_URL is not configured' };
    try {
      const pong = await client.ping();
      return { ok: pong === 'PONG', latencyMs: Date.now() - started };
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
    if (!key) return { ok: false, error: 'MEILI_MASTER_KEY is not configured' };
    try {
      const response = await fetch(`${host}/health`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      return {
        ok: response.ok,
        latencyMs: Date.now() - started,
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
}
