import { Module, forwardRef } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MessengerController } from './messenger.controller';
import { MessengerService } from './messenger.service';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    RealtimeModule,
    NotificationsModule,
    ActivityFeedModule,
    forwardRef(() => WebhooksModule),
  ],
  controllers: [MessengerController],
  providers: [MessengerService],
  exports: [MessengerService],
})
export class MessengerModule {}
