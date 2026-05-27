import { Injectable, Logger } from '@nestjs/common';
import { MATCHING_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { TreeMatchingJobPayload } from './matching.processor';

@Injectable()
export class MatchingQueueService {
  private readonly logger = new Logger(MatchingQueueService.name);
  private queue: Queue<TreeMatchingJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getQueue(): Queue<TreeMatchingJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(MATCHING_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueueRun(runId: string, familyId: string, workspaceId: string, requestedBy: string) {
    const queue = this.getQueue();
    if (!queue) {
      await this.prisma.treeMatchRun.update({
        where: { id: runId },
        data: {
          status: 'SKIPPED',
          error: 'REDIS_URL is not configured — matching run executes inline only via processor fallback',
        },
      });
      this.logger.warn('Tree matching queue skipped — Redis unavailable');
      return { runId, queued: false };
    }

    await queue.add(
      'run-family',
      { runId, familyId, workspaceId, requestedBy },
      {
        jobId: runId,
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return { runId, queued: true };
  }
}
