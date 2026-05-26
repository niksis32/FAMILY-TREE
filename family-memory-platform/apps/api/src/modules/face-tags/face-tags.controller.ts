import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { CreateFaceTagDto, UpdateFaceTagDto } from './face-tags.dto';
import { FaceTagsService } from './face-tags.service';

@ApiTags('face-tags')
@ApiBearerAuth()
@Controller('media/:mediaId/face-tags')
export class FaceTagsController {
  constructor(
    private readonly service: FaceTagsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  @Get()
  list(@Param('mediaId') mediaId: string) {
    return this.service.listByMedia(mediaId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async create(
    @Param('mediaId') mediaId: string,
    @Body() dto: CreateFaceTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tag = await this.service.create(mediaId, dto, user.id);
    if (dto.personId) {
      await this.gamification.record({
        userId: user.id,
        action: GAMIFICATION_ACTIONS.PHOTO_FACE_TAG,
        entityType: 'photo-face-tag',
        entityId: tag.id,
        payload: { mediaId, personId: dto.personId },
      });
    }
    return tag;
  }

  @Patch(':tagId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async update(
    @Param('tagId') tagId: string,
    @Body() dto: UpdateFaceTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tag = await this.service.update(tagId, dto);
    if (dto.personId) {
      await this.gamification.record({
        userId: user.id,
        action: GAMIFICATION_ACTIONS.PHOTO_FACE_TAG,
        entityType: 'photo-face-tag',
        entityId: tag.id,
        payload: { mediaId: tag.mediaId, personId: dto.personId },
      });
    }
    return tag;
  }

  @Delete(':tagId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  remove(@Param('tagId') tagId: string) {
    return this.service.remove(tagId);
  }
}
