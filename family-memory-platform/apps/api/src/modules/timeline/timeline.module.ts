import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';

/** Per-person life timeline — aggregates events and custom items */
@Module({
  controllers: [TimelineController],
  providers: [TimelineService],
})
export class TimelineModule {}
