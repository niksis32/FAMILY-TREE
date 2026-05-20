import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OcrPreviewDto, RelationshipSuggestDto, TimelineSummaryDto } from './ai.dto';
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
}
