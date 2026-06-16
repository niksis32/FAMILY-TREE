/** BullMQ queue for daily calendar reminder dispatch */
export const CALENDAR_REMINDER_QUEUE = 'calendar-reminder';

/** Default: run daily at 08:00 UTC */
export const CALENDAR_REMINDER_CRON = '0 8 * * *';
