import { Injectable, Logger } from '@nestjs/common';
import type { WebhookEventType } from '@family/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDeliveryQueueService } from './webhook-delivery.queue';

export type WebhookEmitParams = {
  workspaceId: string;
  eventType: WebhookEventType;
  entityType?: string;
  entityId?: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
};

@Injectable()
export class WebhookEmitterService {
  private readonly logger = new Logger(WebhookEmitterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryQueue: WebhookDeliveryQueueService,
  ) {}

  async emit(params: WebhookEmitParams): Promise<void> {
    try {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: {
          workspaceId: params.workspaceId,
          status: 'ACTIVE',
          subscribedEvents: { has: params.eventType },
        },
      });

      if (!endpoints.length) return;

      for (const endpoint of endpoints) {
        if (params.idempotencyKey) {
          const existing = await this.prisma.webhookEvent.findFirst({
            where: {
              endpointId: endpoint.id,
              idempotencyKey: params.idempotencyKey,
            },
          });
          if (existing) continue;
        }

        const event = await this.prisma.webhookEvent.create({
          data: {
            workspaceId: params.workspaceId,
            endpointId: endpoint.id,
            eventType: params.eventType,
            status: 'PENDING',
            payload: params.data as Prisma.InputJsonValue,
            entityType: params.entityType ?? null,
            entityId: params.entityId ?? null,
            idempotencyKey: params.idempotencyKey ?? null,
            attemptCount: 0,
          },
        });

        await this.deliveryQueue.enqueue({
          eventId: event.id,
          endpointId: endpoint.id,
          attemptNumber: 1,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook emit failed';
      this.logger.warn(`Webhook emit skipped for ${params.eventType}: ${message}`);
    }
  }
}
