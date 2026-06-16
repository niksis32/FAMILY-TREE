import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateCitationTemplateDto, CreateEvidenceCitationDto, UpdateCitationTemplateDto } from './evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('evidence')
@ApiBearerAuth()
@Controller('evidence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Get('templates')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('templates')
  @Roles('ADMIN', 'EDITOR')
  createTemplate(@Body() dto: CreateCitationTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Patch('templates/:id')
  @Roles('ADMIN', 'EDITOR')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateCitationTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles('ADMIN')
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Get('citations')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  listCitations(@Query('personId') personId?: string, @Query('eventId') eventId?: string) {
    return this.service.listCitations(personId, eventId);
  }

  @Post('citations')
  @Roles('ADMIN', 'EDITOR')
  createCitation(@Body() dto: CreateEvidenceCitationDto, @CurrentUser() _user: AuthenticatedUser) {
    return this.service.createCitation(dto);
  }

  @Get('bibliography/export')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  exportBibliography(@Query('format') format?: 'text' | 'bibtex' | 'json') {
    return this.service.exportBibliography(format ?? 'text');
  }
}
