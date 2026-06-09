import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { WorkspaceExportService } from './workspace-export.service';

@ApiTags('workspace-export')
@Controller('workspaces/:workspaceId/exports')
export class WorkspaceExportController {
  constructor(private readonly exports: WorkspaceExportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  request(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exports.requestExport(workspaceId, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  list(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exports.listJobs(workspaceId, user.id);
  }

  @Get(':jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOne(
    @Param('workspaceId') _workspaceId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exports.getJob(jobId, user.id);
  }
}
