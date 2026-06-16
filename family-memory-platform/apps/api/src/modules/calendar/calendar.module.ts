import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CalendarController } from './calendar.controller';
import { CalendarReminderProcessor } from './calendar-reminder.processor';
import { CalendarReminderQueueService } from './calendar-reminder.queue';
import { CalendarService } from './calendar.service';

@Module({
  imports: [AuthModule, NotificationsModule, PrismaModule, RedisModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarReminderQueueService, CalendarReminderProcessor],
  exports: [CalendarService],
})
export class CalendarModule {}
