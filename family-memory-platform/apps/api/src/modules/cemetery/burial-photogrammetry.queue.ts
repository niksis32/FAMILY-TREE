import { Injectable, Logger } from '@nestjs/common';
import { BURIAL_PHOTOGRAMMETRY_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type BurialPhotogrammetryJobPayload = {
  jobId: string;
  workspaceId: string;
  burialSiteId: string;
};

@Injectable()
export class BurialPhotogrammetryQueueService {
  private readonly logger = new Logger(BurialPhotogrammetryQueueService.name);
  private queue: Queue<BurialPhotogrammetryJobPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<BurialPhotogrammetryJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(BURIAL_PHOTOGRAMMETRY_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueue(jobId: string, workspaceId: string, burialSiteId: string) {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Burial photogrammetry skipped — Redis unavailable');
      return null;
    }
    return queue.add(
      'reconstruct',
      { jobId, workspaceId, burialSiteId },
      {
        jobId,
        removeOnComplete: 30,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
      },
    );
  }
}
