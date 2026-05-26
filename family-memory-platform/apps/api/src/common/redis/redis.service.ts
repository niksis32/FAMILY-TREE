import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  getConnection(): Redis | null {
    if (this.client) return this.client;

    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL is not set — photo analysis queue disabled');
      return null;
    }

    this.client = new Redis(url, { maxRetriesPerRequest: null });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    return this.client;
  }

  isAvailable(): boolean {
    return Boolean(this.getUrl());
  }

  getUrl(): string | null {
    return this.config.get<string>('REDIS_URL') ?? null;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
