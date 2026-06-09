import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LIVING_PERSON_RECALC_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { LivingPersonPolicyService } from './living-person-policy.service';
import type { LivingPersonRecalcPayload } from './living-person-recalc.queue';

@Injectable()
export class LivingPersonRecalcProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LivingPersonRecalcProcessor.name);
  private worker: Worker<LivingPersonRecalcPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly policy: LivingPersonPolicyService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<LivingPersonRecalcPayload>(
      LIVING_PERSON_RECALC_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Living recalc job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<LivingPersonRecalcPayload>) {
    if (job.data.workspaceId) {
      return this.policy.recalcWorkspace(job.data.workspaceId);
    }
    return this.policy.recalcAllWorkspaces();
  }
}
