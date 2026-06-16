import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { RealtimeEnvelope } from '@family/shared';
import { realtimeUserChannel, realtimeWorkspaceChannel } from '@family/shared';
import Redis from 'ioredis';
import { RedisService } from '../../common/redis/redis.service';

type RealtimeHandler = (envelope: RealtimeEnvelope) => void;

@Injectable()
export class RealtimePubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimePubSubService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly handlers = new Set<RealtimeHandler>();

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    const conn = this.redis.getConnection();
    if (!conn) {
      this.logger.warn('Redis unavailable — realtime pub/sub disabled (in-process only)');
      return;
    }
    this.publisher = conn;
    this.subscriber = conn.duplicate();
    this.subscriber.on('message', (_channel, raw) => {
      try {
        const envelope = JSON.parse(raw) as RealtimeEnvelope;
        for (const handler of this.handlers) handler(envelope);
      } catch (err) {
        this.logger.warn(`Invalid realtime payload: ${(err as Error).message}`);
      }
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.publisher = null;
  }

  onEnvelope(handler: RealtimeHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async subscribeWorkspace(workspaceId: string) {
    if (!this.subscriber) return;
    await this.subscriber.subscribe(realtimeWorkspaceChannel(workspaceId));
  }

  async unsubscribeWorkspace(workspaceId: string) {
    if (!this.subscriber) return;
    await this.subscriber.unsubscribe(realtimeWorkspaceChannel(workspaceId));
  }

  async subscribeUser(userId: string) {
    if (!this.subscriber) return;
    await this.subscriber.subscribe(realtimeUserChannel(userId));
  }

  async unsubscribeUser(userId: string) {
    if (!this.subscriber) return;
    await this.subscriber.unsubscribe(realtimeUserChannel(userId));
  }

  async publishWorkspace(workspaceId: string, envelope: RealtimeEnvelope) {
    await this.publish(realtimeWorkspaceChannel(workspaceId), envelope);
  }

  async publishUser(userId: string, envelope: RealtimeEnvelope) {
    await this.publish(realtimeUserChannel(userId), envelope);
  }

  private async publish(channel: string, envelope: RealtimeEnvelope) {
    const payload = JSON.stringify(envelope);
    if (this.publisher) {
      await this.publisher.publish(channel, payload);
      return;
    }
    for (const handler of this.handlers) handler(envelope);
  }
}
