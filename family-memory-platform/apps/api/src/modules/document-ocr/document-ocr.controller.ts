import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  enqueue(@Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.queue.enqueue(documentId, user.id);
  }

  @Get(':documentId/status')
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
