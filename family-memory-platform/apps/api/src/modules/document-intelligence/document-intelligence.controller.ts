import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateCitationDto } from '../citations/citations.dto';
import { CreateEventDto } from '../events/events.dto';
import { CreateRelationshipDto } from '../relationships/relationships.dto';
import { DocumentIntelligenceService } from './document-intelligence.service';
import { ExtractEntitiesDto } from './dto/extract-entities.dto';
import { OcrDocumentDto } from './dto/ocr-document.dto';
import { RejectSuggestionDto } from './dto/reject-suggestion.dto';
import { SuggestEventsDto } from './dto/suggest-events.dto';
import { SuggestRelationshipsDto } from './dto/suggest-relationships.dto';
import { SummarizeDocumentDto } from './dto/summarize-document.dto';

/** PROMPT 7 — AI suggests only; tree changes via explicit confirm endpoints. */
@ApiTags('document-intelligence')
@ApiBearerAuth()
@Controller('document-intelligence')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class DocumentIntelligenceController {
  constructor(private readonly service: DocumentIntelligenceService) {}

  @Post('ocr')
  runOcr(@Body() dto: OcrDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.runOcr(user, dto);
  }

  @Post('entities')
  extractEntities(@Body() dto: ExtractEntitiesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.extractEntities(user, dto);
  }

  @Post('events')
  suggestEvents(@Body() dto: SuggestEventsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.suggestEvents(user, dto);
  }

  @Post('relationships')
  suggestRelationships(@Body() dto: SuggestRelationshipsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.suggestRelationships(user, dto);
  }

  @Post('summary')
  summarize(@Body() dto: SummarizeDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summarize(user, dto);
  }

  @Get(':documentId/results')
  getResults(@Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getResults(user, documentId);
  }

  @Post(':documentId/confirm-event')
  confirmEvent(
    @Param('documentId') documentId: string,
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmEvent(user, documentId, dto);
  }

  @Post(':documentId/confirm-relationship')
  confirmRelationship(
    @Param('documentId') documentId: string,
    @Body() dto: CreateRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmRelationship(user, documentId, dto);
  }

  @Post(':documentId/confirm-citation')
  confirmCitation(
    @Param('documentId') documentId: string,
    @Body() dto: CreateCitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmCitation(user, documentId, dto);
  }

  @Post(':documentId/reject')
  reject(
    @Param('documentId') documentId: string,
    @Body() dto: RejectSuggestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.rejectSuggestion(user, documentId, dto);
  }
}
