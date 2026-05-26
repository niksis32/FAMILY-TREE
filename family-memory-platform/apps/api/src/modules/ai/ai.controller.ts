import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Post('ocr/preview')
  ocrPreview(@Body() dto: OcrPreviewDto) {
    return this.service.ocrPreview(dto);
  }

  @Post('relationship/suggest')
  suggestRelationship(@Body() dto: RelationshipSuggestDto) {
    return this.service.suggestRelationship(dto);
  }

  @Post('timeline/summary')
  summarizeTimeline(@Body() dto: TimelineSummaryDto) {
    return this.service.summarizeTimeline(dto);
  }

  @Post('photo/detect-faces')
  detectPhotoFaces(@Body() dto: PhotoDetectFacesDto) {
    return this.service.detectPhotoFaces(dto);
  }

  @Post('photo/suggest-person')
  suggestPhotoPerson(@Body() dto: PhotoSuggestPersonDto) {
    return this.service.suggestPhotoPerson(dto);
  }

  @Post('photo/extract-context')
  extractPhotoContext(@Body() dto: PhotoImageContextDto) {
    return this.service.extractPhotoContext(dto);
  }

  @Post('photo/estimate-period')
  estimatePhotoPeriod(@Body() dto: PhotoImageContextDto) {
    return this.service.estimatePhotoPeriod(dto);
  }
}
