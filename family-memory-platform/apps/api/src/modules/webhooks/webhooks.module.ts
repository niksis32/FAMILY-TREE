import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WebhookDeliveryQueueService } from './webhook-delivery.queue';
import { WebhookDomainHooksService } from './webhook-domain-hooks.service';
import { WebhookEmitterService } from './webhook-emitter.service';
import { WebhookSigningService } from './webhook-signing.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [AuthModule, CommercialModule, PrismaModule, RedisModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookEmitterService,
    WebhookDomainHooksService,
    WebhookSigningService,
    WebhookDeliveryQueueService,
    WebhookDeliveryProcessor,
  ],
  exports: [WebhookEmitterService, WebhookDomainHooksService],
})
export class WebhooksModule {}
