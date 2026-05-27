import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { CreateDocumentUploadUrlDto } from './documents-upload.dto';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  createUploadUrl(@Body() dto: CreateDocumentUploadUrlDto) {
    return this.service.createUploadUrl(dto);
  }

  @Get(':id/download-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  downloadUrl(@Param('id') id: string) {
    return this.service.getPresignedDownloadUrl(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    const document = await this.service.create(dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.DOCUMENT_CREATE,
      entityType: 'document',
      entityId: document.id,
    });
    return document;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    const document = await this.service.update(id, dto);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.DOCUMENT_UPDATE,
      entityType: 'document',
      entityId: document.id,
    });
    return document;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
