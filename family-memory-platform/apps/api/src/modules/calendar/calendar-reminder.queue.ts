import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CALENDAR_REMINDER_CRON, CALENDAR_REMINDER_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';

export type CalendarReminderPayload = { trigger: 'scheduled' | 'manual' };

@Injectable()
export class CalendarReminderQueueService implements OnModuleInit {
  private readonly logger = new Logger(CalendarReminderQueueService.name);
  private queue: Queue<CalendarReminderPayload> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getQueue(): Queue<CalendarReminderPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(CALENDAR_REMINDER_QUEUE, { connection: { url } });
    return this.queue;
  }

  async onModuleInit() {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.warn('Calendar reminder scheduler skipped — Redis unavailable');
      return;
    }

    await queue.add(
      'daily-reminders',
      { trigger: 'scheduled' },
      {
        repeat: { pattern: CALENDAR_REMINDER_CRON },
        jobId: 'calendar-reminder-daily',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Calendar reminder cron registered (${CALENDAR_REMINDER_CRON} UTC)`);
  }

  async enqueueManual() {
    const queue = this.getQueue();
    if (!queue) return { queued: false };
    await queue.add('manual-reminders', { trigger: 'manual' });
    return { queued: true };
  }
}
