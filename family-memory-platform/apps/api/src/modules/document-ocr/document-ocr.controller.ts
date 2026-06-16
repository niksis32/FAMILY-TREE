import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DocumentOcrQueueService } from './document-ocr.queue';

@ApiTags('document-ocr')
@ApiBearerAuth()
@Controller('document-ocr')
export class DocumentOcrController {
  constructor(private readonly queue: DocumentOcrQueueService) {}

  @Post(':documentId/enqueue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  enqueue(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('language') language?: string,
    @Query('force') force?: string,
  ) {
    return this.queue.enqueue(documentId, user.id, language ?? 'ru', force === 'true');
  }

  @Get(':documentId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async status(@Param('documentId') documentId: string) {
    const job = await this.queue.getLatestJob(documentId);
    if (!job) return { documentId, status: null };
    return {
      documentId,
      id: job.id,
      status: job.status,
      error: job.error,
      language: job.language,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
