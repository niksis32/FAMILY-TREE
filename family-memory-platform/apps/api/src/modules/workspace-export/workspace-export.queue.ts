import { Injectable, Logger } from '@nestjs/common';
import { WORKSPACE_EXPORT_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type WorkspaceExportJobPayload = {
  jobId: string;
  workspaceId: string;
  requestedById: string;
};

@Injectable()
export class WorkspaceExportQueueService {
  private readonly logger = new Logger(WorkspaceExportQueueService.name);
  private queue: Queue<WorkspaceExportJobPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<WorkspaceExportJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(WORKSPACE_EXPORT_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueue(jobId: string, workspaceId: string, requestedById: string) {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Workspace export skipped — Redis unavailable');
      return null;
    }
    return queue.add(
      'export',
      { jobId, workspaceId, requestedById },
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
