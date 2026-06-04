import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { BulkAssignFaceTagsDto } from './person-photo-links.dto';
import { PersonPhotoLinksService } from './person-photo-links.service';

/**
 * Static `/media/*` photo-intelligence routes must register before MediaController `@Get(':id')`,
 * otherwise `bulk-tagging` is treated as a media id → 404 "Media file not found".
 */
@ApiTags('person-photo-links')
@ApiBearerAuth()
@Controller('media')
export class MediaPhotoIntelligenceController {
  constructor(
    private readonly service: PersonPhotoLinksService,
    private readonly gamification: GamificationActivityService,
  ) {}

  @Get('bulk-tagging')
  bulkQueue() {
    return this.service.listBulkTaggingQueue();
  }

  @Post('bulk-tagging/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async bulkAssign(@Body() dto: BulkAssignFaceTagsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.service.bulkAssign(dto);
    for (const tag of result.tags) {
      if (tag.personId) {
        await this.gamification.record({
          userId: user.id,
          action: GAMIFICATION_ACTIONS.PHOTO_FACE_TAG,
          entityType: 'photo-face-tag',
          entityId: tag.id,
          payload: { mediaId: tag.mediaId, personId: tag.personId, bulk: true },
        });
      }
    }
    return result;
  }
}
