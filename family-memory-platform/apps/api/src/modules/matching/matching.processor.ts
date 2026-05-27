import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MATCHING_QUEUE } from '@family/shared';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { MatchingService } from './matching.service';

export interface TreeMatchingJobPayload {
  runId: string;
  familyId: string;
  workspaceId: string;
  requestedBy: string;
}

@Injectable()
export class MatchingProcessor implements OnModuleInit {
  private readonly logger = new Logger(MatchingProcessor.name);
  private worker: Worker<TreeMatchingJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly matching: MatchingService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) {
      this.logger.warn('Matching worker not started — REDIS_URL missing');
      return;
    }

    this.worker = new Worker<TreeMatchingJobPayload>(
      MATCHING_QUEUE,
      async (job) => {
        await this.matching.executeRun(job.data.runId);
      },
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Matching job ${job?.id} failed: ${err.message}`);
    });
  }
}
