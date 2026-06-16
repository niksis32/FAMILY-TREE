import { Injectable, Logger } from '@nestjs/common';
import { WEBHOOK_DELIVERY_QUEUE, WEBHOOK_MAX_ATTEMPTS, WEBHOOK_RETRY_DELAYS_MS } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type WebhookDeliveryJobPayload = {
  eventId: string;
  endpointId: string;
  attemptNumber: number;
};

@Injectable()
export class WebhookDeliveryQueueService {
  private readonly logger = new Logger(WebhookDeliveryQueueService.name);
  private queue: Queue<WebhookDeliveryJobPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<WebhookDeliveryJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(WEBHOOK_DELIVERY_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueue(payload: WebhookDeliveryJobPayload, delayMs = 0) {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn(`Webhook delivery skipped — Redis unavailable (event ${payload.eventId})`);
      return { queued: false };
    }

    const jobId = `${payload.eventId}:${payload.attemptNumber}`;
    await queue.add('deliver', payload, {
      jobId,
      removeOnComplete: 200,
      removeOnFail: 500,
      attempts: 1,
      delay: delayMs,
    });
    return { queued: true };
  }

  retryDelayMs(attemptNumber: number): number {
    const index = Math.min(Math.max(attemptNumber - 1, 0), WEBHOOK_RETRY_DELAYS_MS.length - 1);
    return WEBHOOK_RETRY_DELAYS_MS[index] ?? 0;
  }

  maxAttempts(): number {
    return WEBHOOK_MAX_ATTEMPTS;
  }
}
