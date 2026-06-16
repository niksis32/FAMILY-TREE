import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ActivityFeedController } from './activity-feed.controller';
import { ActivityFeedService } from './activity-feed.service';
import { ActivityRecorderService } from './activity-recorder.service';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService, ActivityRecorderService],
  exports: [ActivityRecorderService],
})
export class ActivityFeedModule {}
