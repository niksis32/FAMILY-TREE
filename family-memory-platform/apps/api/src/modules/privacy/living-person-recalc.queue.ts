import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LIVING_PERSON_RECALC_CRON, LIVING_PERSON_RECALC_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type LivingPersonRecalcPayload = {
  workspaceId?: string;
  trigger: 'manual' | 'scheduled';
};

@Injectable()
export class LivingPersonRecalcQueueService implements OnModuleInit {
  private readonly logger = new Logger(LivingPersonRecalcQueueService.name);
  private queue: Queue<LivingPersonRecalcPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<LivingPersonRecalcPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(LIVING_PERSON_RECALC_QUEUE, { connection: { url } });
    return this.queue;
  }

  async onModuleInit() {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Living person recalc scheduler skipped — Redis unavailable');
      return;
    }

    await queue.add(
      'scheduled-recalc',
      { trigger: 'scheduled' },
      {
        repeat: { pattern: LIVING_PERSON_RECALC_CRON },
        jobId: 'living-person-recalc-daily',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Living person recalc cron registered (${LIVING_PERSON_RECALC_CRON} UTC)`);
  }

  async enqueue(payload: LivingPersonRecalcPayload) {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Living person recalc skipped — Redis unavailable');
      return null;
    }
    return queue.add('recalc', payload, {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 2,
    });
  }
}
