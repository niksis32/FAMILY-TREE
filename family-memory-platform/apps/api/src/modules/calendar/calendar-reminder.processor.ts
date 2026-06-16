import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CALENDAR_REMINDER_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { CalendarService } from './calendar.service';
import type { CalendarReminderPayload } from './calendar-reminder.queue';

@Injectable()
export class CalendarReminderProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalendarReminderProcessor.name);
  private worker: Worker<CalendarReminderPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly calendar: CalendarService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<CalendarReminderPayload>(
      CALENDAR_REMINDER_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Calendar reminder job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<CalendarReminderPayload>) {
    this.logger.log(`Running calendar reminders (${job.data.trigger})`);
    return this.calendar.processDailyRemindersForAll();
  }
}
