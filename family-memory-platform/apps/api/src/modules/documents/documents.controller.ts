import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAMIFICATION_ACTIONS } from '@family/shared';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GamificationActivityService } from '../gamification/gamification-activity.service';
import { DocumentOcrQueueService } from '../document-ocr/document-ocr.queue';
import { CreateDocumentUploadUrlDto } from './documents-upload.dto';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly gamification: GamificationActivityService,
    private readonly documentOcrQueue: DocumentOcrQueueService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }

  @Post('upload-url')
  @Roles('ADMIN', 'EDITOR')
  createUploadUrl(@Body() dto: CreateDocumentUploadUrlDto) {
    return this.service.createUploadUrl(dto);
  }

  @Get(':id/download-url')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  downloadUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getPresignedDownloadUrl(id, user);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    const document = await this.service.create(dto, user);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.DOCUMENT_CREATE,
      entityType: 'document',
      entityId: document.id,
    });
    await this.documentOcrQueue.enqueueAfterUpload(document.id, dto.mimeType, user.id);
    return document;
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    const document = await this.service.update(id, dto, user);
    await this.gamification.record({
      userId: user.id,
      action: GAMIFICATION_ACTIONS.DOCUMENT_UPDATE,
      entityType: 'document',
      entityId: document.id,
    });
    return document;
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
