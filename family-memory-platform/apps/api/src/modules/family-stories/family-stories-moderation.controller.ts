import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApproveFamilyStoryDto, RejectFamilyStoryDto } from './family-stories-moderation.dto';
import { FamilyStoriesService } from './family-stories.service';

@ApiTags('family-stories-moderation')
@ApiBearerAuth()
@Controller('family-stories/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FamilyStoriesModerationController {
  constructor(private readonly service: FamilyStoriesService) {}

  @Get('queue')
  queue() {
    return this.service.listModerationQueue();
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveFamilyStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approveStory(id, user.id, dto.moderationNote);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectFamilyStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.rejectStory(id, user.id, dto.moderationNote);
  }
}
