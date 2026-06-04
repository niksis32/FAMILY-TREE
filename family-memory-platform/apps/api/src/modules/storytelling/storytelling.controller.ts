import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  GenerateDocumentSummaryStoryDto,
  GenerateEraContextDto,
  GenerateFamilyStoryDto,
  GenerateMigrationStoryDto,
  GeneratePersonStoryDto,
  GenerateTimelineNarrativeDto,
  UpdateStoryDraftDto,
} from './storytelling.dto';
import { StorytellingService } from './storytelling.service';

@ApiTags('storytelling')
@ApiBearerAuth()
@Controller('storytelling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class StorytellingController {
  constructor(private readonly service: StorytellingService) {}

  @Post('person/:personId/generate')
  generatePerson(
    @Param('personId') personId: string,
    @Body() dto: GeneratePersonStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generatePersonStory(user, personId, dto);
  }

  @Post('timeline/:personId/narrative')
  generateTimelineNarrative(
    @Param('personId') personId: string,
    @Body() dto: GenerateTimelineNarrativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generateTimelineNarrative(user, personId, dto);
  }

  @Post('document/:documentId/summary')
  generateDocumentSummary(
    @Param('documentId') documentId: string,
    @Body() dto: GenerateDocumentSummaryStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generateDocumentSummary(user, documentId, dto);
  }

  @Post('family/:familyId/generate')
  generateFamily(
    @Param('familyId') familyId: string,
    @Body() dto: GenerateFamilyStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generateFamilyStory(user, familyId, dto);
  }

  @Post('migration/generate')
  generateMigration(@Body() dto: GenerateMigrationStoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.generateMigrationStory(
      user,
      { personId: dto.personId, familyId: dto.familyId, personIds: dto.personIds },
      dto,
    );
  }

  @Post('era-context')
  generateEraContext(@Body() dto: GenerateEraContextDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.generateEraContext(
      user,
      { personId: dto.personId, familyId: dto.familyId, yearFrom: dto.yearFrom, yearTo: dto.yearTo },
      dto,
    );
  }

  @Get('drafts/:id')
  draftOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getDraftDtoOwned(id, user.id);
  }

  @Get('drafts')
  draftsList(
    @Query('type') type: string | undefined,
    @Query('personId') personId: string | undefined,
    @Query('familyId') familyId: string | undefined,
    @Query('documentId') documentId: string | undefined,
    @Query('q') q: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listDraftsOwned(user.id, { type, personId, familyId, documentId, q });
  }

  @Patch('drafts/:id')
  updateDraft(@Param('id') id: string, @Body() dto: UpdateStoryDraftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateDraftOwned(id, user.id, dto);
  }

  @Post('drafts/:id/fact-check')
  factCheckDraft(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.factCheckDraftOwned(id, user);
  }

  @Delete('drafts/:id')
  removeDraft(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeDraftOwned(id, user.id);
  }
}

