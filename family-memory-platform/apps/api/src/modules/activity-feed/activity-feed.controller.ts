import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ActivityEventType } from '@family/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityFeedService } from './activity-feed.service';

@ApiTags('activity-feed')
@ApiBearerAuth()
@Controller('activity-feed')
@UseGuards(JwtAuthGuard)
export class ActivityFeedController {
  constructor(private readonly service: ActivityFeedService) {}

  @Get()
  list(
    @Query('type') type?: ActivityEventType,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      type,
      cursor,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }
}
