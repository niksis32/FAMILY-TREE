import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/** Life events: birth, death, marriage, residence, etc. */
@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
