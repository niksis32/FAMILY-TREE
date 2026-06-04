import { Body, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { PhotoAnalysisQueueService } from '../photo-analysis/photo-analysis.queue';
import { CreateMediaMetadataDto, CreateUploadUrlDto, LinkMediaDto } from './media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(
    private readonly service: MediaService,
    private readonly gamification: GamificationActivityService,
    private readonly photoAnalysisQueue: PhotoAnalysisQueueService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }

  @Post('upload-url')
  @Roles('ADMIN', 'EDITOR')
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.service.createUploadUrl(dto);
  }

  @Post('metadata')
  @Roles('ADMIN', 'EDITOR')
  async createMetadata(@Body() dto: CreateMediaMetadataDto, @CurrentUser() user: AuthenticatedUser) {
    const media = await this.service.createMetadata(dto, user);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.MEDIA_CREATE,
      entityType: 'media',
      entityId: media.id,
    });
    await this.photoAnalysisQueue.enqueueAfterUpload(media.id, dto.mimeType, user.id);
    return media;
  }

  @Get(':id/download-url')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  createDownloadUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createDownloadUrl(id, user);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const media = await this.service.findOne(id, user);
    if (!media) {
      throw new NotFoundException('Media file not found');
    }
    return media;
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @Post(':id/link')
  @Roles('ADMIN', 'EDITOR')
  async link(@Param('id') id: string, @Body() dto: LinkMediaDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.service.linkMedia(id, dto, user);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.MEDIA_LINK,
      entityType: dto.entityType,
      entityId: dto.entityId,
      payload: { mediaId: id },
    });
    return result;
  }
}
