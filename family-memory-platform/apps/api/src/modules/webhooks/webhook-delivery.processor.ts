import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WEBHOOK_AUTO_DISABLE_AFTER,
  WEBHOOK_DELIVERY_QUEUE,
  WEBHOOK_HTTP_TIMEOUT_MS,
  WEBHOOK_MAX_ATTEMPTS,
  type WebhookEventType,
} from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WebhookDeliveryQueueService, type WebhookDeliveryJobPayload } from './webhook-delivery.queue';
import { decryptWebhookSecret } from './webhook-secret';
import { WebhookSigningService } from './webhook-signing.service';

@Injectable()
export class WebhookDeliveryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);
  private worker: Worker<WebhookDeliveryJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly signing: WebhookSigningService,
    private readonly deliveryQueue: WebhookDeliveryQueueService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<WebhookDeliveryJobPayload>(
      WEBHOOK_DELIVERY_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Webhook delivery job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<WebhookDeliveryJobPayload>) {
    const { eventId, endpointId, attemptNumber } = job.data;
    const started = Date.now();

    const event = await this.prisma.webhookEvent.findFirst({
      where: { id: eventId, endpointId },
      include: { endpoint: true },
    });
    if (!event || !event.endpoint) {
      this.logger.warn(`Webhook event ${eventId} not found — skipping delivery`);
      return;
    }

    if (event.endpoint.status !== 'ACTIVE') {
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { status: 'CANCELLED', lastError: 'Endpoint disabled' },
      });
      return;
    }

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'DELIVERING' },
    });

    let httpStatus: number | null = null;
    let responseBodySnippet: string | null = null;
    let errorMessage: string | null = null;

    try {
      const secret = decryptWebhookSecret(
        event.endpoint.secretEnc,
        this.encryptionKey(),
      );
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const signed = this.signing.buildSignedRequest({
        secret,
        eventId: event.id,
        workspaceId: event.workspaceId,
        eventType: event.eventType as WebhookEventType,
        payload,
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_HTTP_TIMEOUT_MS);

      try {
        const response = await fetch(event.endpoint.url, {
          method: 'POST',
          headers: signed.headers,
          body: signed.body,
          signal: controller.signal,
        });
        httpStatus = response.status;
        const text = await response.text();
        responseBodySnippet = text.slice(0, 1024);

        if (response.ok) {
          await this.recordAttempt(eventId, attemptNumber, httpStatus, responseBodySnippet, Date.now() - started);
          await this.prisma.webhookEvent.update({
            where: { id: eventId },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
              lastError: null,
              attemptCount: attemptNumber,
              nextRetryAt: null,
            },
          });
          await this.prisma.webhookEndpoint.update({
            where: { id: endpointId },
            data: {
              lastSuccessAt: new Date(),
              consecutiveFailures: 0,
            },
          });
          return;
        }

        errorMessage = `HTTP ${response.status}`;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Webhook delivery failed';
    }

    await this.recordAttempt(
      eventId,
      attemptNumber,
      httpStatus,
      responseBodySnippet,
      Date.now() - started,
      errorMessage,
    );

    if (attemptNumber >= WEBHOOK_MAX_ATTEMPTS) {
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'DEAD_LETTER',
          lastError: errorMessage,
          attemptCount: attemptNumber,
          nextRetryAt: null,
        },
      });
      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { consecutiveFailures: { increment: 1 } },
      });
      await this.maybeAutoDisableEndpoint(endpointId);
      return;
    }

    const nextAttempt = attemptNumber + 1;
    const delayMs = this.deliveryQueue.retryDelayMs(nextAttempt);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
        attemptCount: attemptNumber,
        nextRetryAt,
      },
    });
    await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { consecutiveFailures: { increment: 1 } },
    });
    await this.maybeAutoDisableEndpoint(endpointId);

    await this.deliveryQueue.enqueue(
      { eventId, endpointId, attemptNumber: nextAttempt },
      delayMs,
    );
  }

  private async recordAttempt(
    eventId: string,
    attemptNumber: number,
    httpStatus: number | null,
    responseBodySnippet: string | null,
    durationMs: number,
    errorMessage?: string | null,
  ) {
    await this.prisma.webhookDeliveryAttempt.create({
      data: {
        eventId,
        attemptNumber,
        httpStatus,
        responseBodySnippet,
        durationMs,
        errorMessage: errorMessage ?? null,
      },
    });
  }

  private async maybeAutoDisableEndpoint(endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: endpointId },
      select: { consecutiveFailures: true, status: true },
    });
    if (
      !endpoint ||
      endpoint.status !== 'ACTIVE' ||
      endpoint.consecutiveFailures < WEBHOOK_AUTO_DISABLE_AFTER
    ) {
      return;
    }
    await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { status: 'DISABLED', disabledAt: new Date() },
    });
    this.logger.warn(
      `Webhook endpoint ${endpointId} auto-disabled after ${endpoint.consecutiveFailures} consecutive failures`,
    );
  }

  private encryptionKey() {
    return (
      this.config.get<string>('WEBHOOK_SECRET_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_SECRET') ??
      'webhook-dev-key'
    );
  }
}
