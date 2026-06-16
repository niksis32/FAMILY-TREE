import { Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get('events')
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.listEvents(from, to);
  }

  @Get('export.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="family-calendar.ics"')
  exportIcal(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.exportIcal(from, to);
  }

  @Post('reminders/run')
  runReminders(@CurrentUser() user: AuthenticatedUser) {
    return this.service.processUpcomingReminders(user.id);
  }
}
