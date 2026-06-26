import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WEBHOOK_MAX_ENDPOINTS_PER_WORKSPACE,
  type WebhookEndpointCreateResult,
  type WebhookEndpointSummary,
  type WebhookEventDetail,
  type WebhookEventSummary,
  type WebhookEventType,
} from '@family/shared';
import type { Prisma, WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { WebhookDeliveryQueueService } from './webhook-delivery.queue';
import { WebhookEmitterService } from './webhook-emitter.service';
import {
  encryptWebhookSecret,
  generateWebhookSecret,
} from './webhook-secret';
import { validateWebhookTargetUrl } from './webhook-url.validator';
import type { CreateWebhookEndpointDto, ListWebhookEventsQueryDto, UpdateWebhookEndpointDto } from './webhooks.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly commercial: CommercialContextService,
    private readonly config: ConfigService,
    private readonly emitter: WebhookEmitterService,
    private readonly deliveryQueue: WebhookDeliveryQueueService,
  ) {}

  async listEndpoints(userId: string): Promise<WebhookEndpointSummary[]> {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);

    const rows = await this.prisma.webhookEndpoint.findMany({
      where: { workspaceId, disabledAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapEndpoint(row));
  }

  async createEndpoint(userId: string, dto: CreateWebhookEndpointDto): Promise<WebhookEndpointCreateResult> {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);
    this.assertUrlAllowed(dto.url);

    const count = await this.prisma.webhookEndpoint.count({
      where: { workspaceId, disabledAt: null },
    });
    if (count >= WEBHOOK_MAX_ENDPOINTS_PER_WORKSPACE) {
      throw new BadRequestException(`Maximum ${WEBHOOK_MAX_ENDPOINTS_PER_WORKSPACE} webhook endpoints per workspace`);
    }

    const { raw, hash, prefix } = generateWebhookSecret();
    const row = await this.prisma.webhookEndpoint.create({
      data: {
        workspaceId,
        url: dto.url.trim(),
        description: dto.description?.trim() ?? null,
        subscribedEvents: dto.subscribedEvents,
        secretHash: hash,
        secretPrefix: prefix,
        secretEnc: encryptWebhookSecret(raw, this.encryptionKey()),
        status: 'ACTIVE',
        createdById: userId,
        consecutiveFailures: 0,
      },
    });

    return {
      ...this.mapEndpoint(row),
      secret: raw,
    };
  }

  async getEndpoint(userId: string, id: string): Promise<WebhookEndpointSummary> {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);
    const row = await this.findEndpointOrThrow(workspaceId, id);
    return this.mapEndpoint(row);
  }

  async updateEndpoint(
    userId: string,
    id: string,
    dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpointSummary> {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);
    await this.findEndpointOrThrow(workspaceId, id);

    if (dto.url) {
      this.assertUrlAllowed(dto.url);
    }

    const row = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: dto.url?.trim(),
        description: dto.description?.trim(),
        subscribedEvents: dto.subscribedEvents,
        status: dto.status,
        disabledAt: dto.status === 'DISABLED' ? new Date() : null,
      },
    });
    return this.mapEndpoint(row);
  }

  async deleteEndpoint(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);
    await this.findEndpointOrThrow(workspaceId, id);

    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        status: 'DISABLED',
        disabledAt: new Date(),
      },
    });
    return { id, disabled: true };
  }

  async testEndpoint(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);
    const endpoint = await this.findEndpointOrThrow(workspaceId, id);
    if (endpoint.status !== 'ACTIVE') {
      throw new BadRequestException('Endpoint must be ACTIVE to send a test ping');
    }

    await this.emitter.emit({
      workspaceId,
      eventType: 'PING',
      data: { message: 'Webhook endpoint test from Family Memory Platform' },
      idempotencyKey: `ping:${endpoint.id}:${Date.now()}`,
    });
    return { queued: true, endpointId: endpoint.id };
  }

  async listEvents(userId: string, query: ListWebhookEventsQueryDto) {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);

    const limit = query.limit ?? 25;
    const rows = await this.prisma.webhookEvent.findMany({
      where: {
        workspaceId,
        ...(query.endpointId ? { endpointId: query.endpointId } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.status ? { status: query.status as WebhookEventStatus } : {}),
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const data = (hasMore ? rows.slice(0, limit) : rows).map((row) => this.mapEvent(row));
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async getEvent(userId: string, id: string): Promise<WebhookEventDetail> {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);

    const row = await this.prisma.webhookEvent.findFirst({
      where: { id, workspaceId },
      include: {
        attempts: { orderBy: { attemptNumber: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Webhook event not found');

    return {
      ...this.mapEvent(row),
      payload: (row.payload as Record<string, unknown>) ?? {},
      attempts: row.attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        httpStatus: attempt.httpStatus,
        responseBodySnippet: attempt.responseBodySnippet,
        durationMs: attempt.durationMs ?? 0,
        errorMessage: attempt.errorMessage,
        createdAt: attempt.createdAt.toISOString(),
      })),
    };
  }

  async retryEvent(userId: string, id: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.assertAdminAccess(workspaceId, userId);

    const event = await this.prisma.webhookEvent.findFirst({
      where: { id, workspaceId },
      include: { endpoint: true },
    });
    if (!event) throw new NotFoundException('Webhook event not found');
    if (!['FAILED', 'DEAD_LETTER'].includes(event.status)) {
      throw new BadRequestException('Only FAILED or DEAD_LETTER events can be retried');
    }
    if (!event.endpoint || event.endpoint.status !== 'ACTIVE') {
      throw new BadRequestException('Endpoint is not active');
    }

    const nextAttempt = event.attemptCount + 1;
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: 'PENDING',
        lastError: null,
        nextRetryAt: null,
      },
    });

    await this.deliveryQueue.enqueue({
      eventId: event.id,
      endpointId: event.endpointId,
      attemptNumber: nextAttempt,
    });

    return { id: event.id, queued: true, attemptNumber: nextAttempt };
  }

  private async assertAdminAccess(workspaceId: string, userId: string) {
    await this.commercial.assertWebhooksEnabled(workspaceId, userId);
  }

  private requireWorkspaceId() {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) {
      throw new BadRequestException('X-Workspace-Id header is required');
    }
    return workspaceId;
  }

  private assertUrlAllowed(url: string) {
    const allowHttpLocal = this.config.get<string>('NODE_ENV') !== 'production';
    validateWebhookTargetUrl(url.trim(), allowHttpLocal);
  }

  private async findEndpointOrThrow(workspaceId: string, id: string) {
    const row = await this.prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId, disabledAt: null },
    });
    if (!row) throw new NotFoundException('Webhook endpoint not found');
    return row;
  }

  private mapEndpoint(row: {
    id: string;
    url: string;
    description: string | null;
    status: string;
    subscribedEvents: WebhookEventType[];
    secretPrefix: string;
    lastSuccessAt: Date | null;
    consecutiveFailures: number;
    createdAt: Date;
    updatedAt: Date;
  }): WebhookEndpointSummary {
    return {
      id: row.id,
      url: row.url,
      description: row.description,
      status: row.status as WebhookEndpointSummary['status'],
      subscribedEvents: row.subscribedEvents as WebhookEventType[],
      secretPrefix: row.secretPrefix,
      lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
      consecutiveFailures: row.consecutiveFailures,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapEvent(row: {
    id: string;
    endpointId: string;
    eventType: string;
    status: string;
    entityType: string | null;
    entityId: string | null;
    attemptCount: number;
    nextRetryAt: Date | null;
    deliveredAt: Date | null;
    lastError: string | null;
    createdAt: Date;
  }): WebhookEventSummary {
    return {
      id: row.id,
      endpointId: row.endpointId,
      eventType: row.eventType as WebhookEventType,
      status: row.status as WebhookEventSummary['status'],
      entityType: row.entityType,
      entityId: row.entityId,
      attemptCount: row.attemptCount,
      nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private encryptionKey() {
    return (
      this.config.get<string>('WEBHOOK_SECRET_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_SECRET') ??
      'webhook-dev-key'
    );
  }
}
