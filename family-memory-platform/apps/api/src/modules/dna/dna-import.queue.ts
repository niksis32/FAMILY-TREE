import { Injectable, Logger } from '@nestjs/common';
import { DNA_IMPORT_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type DnaImportJobPayload = {
  jobId: string;
  workspaceId: string;
  userId: string;
};

@Injectable()
export class DnaImportQueueService {
  private readonly logger = new Logger(DnaImportQueueService.name);
  private queue: Queue<DnaImportJobPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<DnaImportJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(DNA_IMPORT_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueue(jobId: string, workspaceId: string, userId: string) {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('DNA import skipped — Redis unavailable');
      return null;
    }
    return queue.add(
      'import',
      { jobId, workspaceId, userId },
      {
        jobId,
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
  }
}
