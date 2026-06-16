import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ARCHIVE_SEARCH_QUEUE } from '@family/shared';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { ExternalArchivesService } from './external-archives.service';

export interface ArchiveSearchJobPayload {
  searchId: string;
}

@Injectable()
export class ArchiveSearchProcessor implements OnModuleInit {
  private readonly logger = new Logger(ArchiveSearchProcessor.name);
  private worker: Worker<ArchiveSearchJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly archives: ExternalArchivesService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) {
      this.logger.warn('Archive search worker not started — REDIS_URL missing');
      return;
    }

    this.worker = new Worker<ArchiveSearchJobPayload>(
      ARCHIVE_SEARCH_QUEUE,
      async (job) => {
        await this.archives.executeSearch(job.data.searchId);
      },
      { connection: { url }, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Archive search job ${job?.id} failed: ${err.message}`);
    });
  }
}
