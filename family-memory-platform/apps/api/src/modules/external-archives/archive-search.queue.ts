import { Injectable, Logger } from '@nestjs/common';
import { ARCHIVE_SEARCH_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import type { ArchiveSearchJobPayload } from './archive-search.processor';

@Injectable()
export class ArchiveSearchQueueService {
  private readonly logger = new Logger(ArchiveSearchQueueService.name);
  private queue: Queue<ArchiveSearchJobPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<ArchiveSearchJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(ARCHIVE_SEARCH_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueue(searchId: string): Promise<{ searchId: string; queued: boolean }> {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Archive search queue skipped — Redis unavailable, executing inline');
      return { searchId, queued: false };
    }

    await queue.add(
      'search',
      { searchId },
      {
        jobId: searchId,
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return { searchId, queued: true };
  }
}
