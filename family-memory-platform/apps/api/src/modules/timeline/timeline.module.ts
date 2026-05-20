import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';

/** Per-person life timeline — aggregates events and custom items */
@Module({
  imports: [PrismaModule],
  controllers: [TimelineController],
  providers: [TimelineService],
})
export class TimelineModule {}
