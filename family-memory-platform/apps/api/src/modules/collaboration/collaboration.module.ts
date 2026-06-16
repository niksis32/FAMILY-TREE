import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationHooksService } from './collaboration-hooks.service';
import { PersonEditLockService } from './person-edit-lock.service';

@Module({
  imports: [
    AuthModule,
    RealtimeModule,
    PrismaModule,
    NotificationsModule,
    ActivityFeedModule,
    WorkspacesModule,
  ],
  controllers: [CollaborationController],
  providers: [PersonEditLockService, CollaborationHooksService],
  exports: [PersonEditLockService, CollaborationHooksService],
})
export class CollaborationModule {}
