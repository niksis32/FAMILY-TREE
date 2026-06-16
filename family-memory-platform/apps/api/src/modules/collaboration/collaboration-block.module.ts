import { Module } from '@nestjs/common';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module';
import { CalendarModule } from '../calendar/calendar.module';
import { CollaborationModule } from './collaboration.module';
import { MessengerModule } from '../messenger/messenger.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

/** BLOCK 1 — Collaboration & Family Communication umbrella module */
@Module({
  imports: [
    RealtimeModule,
    MessengerModule,
    NotificationsModule,
    ActivityFeedModule,
    CollaborationModule,
    CalendarModule,
  ],
  exports: [
    RealtimeModule,
    MessengerModule,
    NotificationsModule,
    ActivityFeedModule,
    CollaborationModule,
    CalendarModule,
  ],
})
export class CollaborationBlockModule {}
