import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SOCIAL_ARCHIVE_IMPORT_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { RedisService } from '../../common/redis/redis.service';
import { SocialArchiveImportService } from './social-archive-import.service';
import { parseSocialArchiveBuffer } from './social-archive-parser';

interface ParseJobPayload {
  importId: string;
}

@Injectable()
export class SocialArchiveImportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialArchiveImportProcessor.name);
  private worker: Worker<ParseJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly minio: MinioStorageService,
    private readonly imports: SocialArchiveImportService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<ParseJobPayload>(
      SOCIAL_ARCHIVE_IMPORT_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Social archive parse ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<ParseJobPayload>) {
    const { importId } = job.data;
    await this.imports.parseImportArchive(importId, async (stagingKey, fileName, provider) => {
      const client = this.minio.createClient();
      const bucket = this.minio.mediaBucket;
      const stream = await client.getObject(bucket, stagingKey);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      return parseSocialArchiveBuffer(buffer, fileName, provider);
    });
  }
}
