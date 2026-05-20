import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/** Life events: birth, death, marriage, residence, etc. */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
