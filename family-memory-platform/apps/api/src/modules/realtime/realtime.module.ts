import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePubSubService } from './realtime-pubsub.service';

@Module({
  imports: [AuthModule, WorkspacesModule],
  providers: [RealtimePubSubService, RealtimeGateway],
  exports: [RealtimePubSubService],
})
export class RealtimeModule {}
