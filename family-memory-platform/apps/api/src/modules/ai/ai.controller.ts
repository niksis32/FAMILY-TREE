import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  OcrPreviewDto,
  PhotoDetectFacesDto,
  PhotoImageContextDto,
  PhotoSuggestPersonDto,
  RelationshipSuggestDto,
  TimelineSummaryDto,
} from './ai.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Post('ocr/preview')
  ocrPreview(@Body() dto: OcrPreviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.ocrPreview(dto, { userId: user.id });
  }

  @Post('relationship/suggest')
  suggestRelationship(@Body() dto: RelationshipSuggestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.suggestRelationship(dto, { userId: user.id });
  }

  @Post('timeline/summary')
  summarizeTimeline(@Body() dto: TimelineSummaryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summarizeTimeline(dto, { userId: user.id });
  }

  @Post('photo/detect-faces')
  detectPhotoFaces(@Body() dto: PhotoDetectFacesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.detectPhotoFaces(dto, { userId: user.id, scope: { mediaId: dto.mediaId } });
  }

  @Post('photo/suggest-person')
  suggestPhotoPerson(@Body() dto: PhotoSuggestPersonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.suggestPhotoPerson(dto, { userId: user.id, scope: { mediaId: dto.mediaId } });
  }

  @Post('photo/extract-context')
  extractPhotoContext(@Body() dto: PhotoImageContextDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.extractPhotoContext(dto, { userId: user.id, scope: { mediaId: dto.mediaId } });
  }

  @Post('photo/estimate-period')
  estimatePhotoPeriod(@Body() dto: PhotoImageContextDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.estimatePhotoPeriod(dto, { userId: user.id, scope: { mediaId: dto.mediaId } });
  }
}
