import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PhotoAnalysisQueueService } from './photo-analysis.queue';

@ApiTags('photo-analysis')
@ApiBearerAuth()
@Controller('photo-analysis')
export class PhotoAnalysisController {
  constructor(private readonly queue: PhotoAnalysisQueueService) {}

  @Post(':mediaId/enqueue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  enqueue(@Param('mediaId') mediaId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.queue.enqueue(mediaId, user.id);
  }

  @Get(':mediaId/status')
  async status(@Param('mediaId') mediaId: string) {
    const job = await this.queue.getLatestJob(mediaId);
    if (!job) return { mediaId, status: null };
    return {
      mediaId,
      id: job.id,
      status: job.status,
      error: job.error,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
