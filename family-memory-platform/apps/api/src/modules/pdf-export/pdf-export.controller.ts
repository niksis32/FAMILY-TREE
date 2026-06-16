import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExportJobDto, PreviewExportDto } from './pdf-export.dto';
import { PdfExportService } from './pdf-export.service';

@ApiTags('pdf-export')
@ApiBearerAuth()
@Controller('export')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  constructor(private readonly service: PdfExportService) {}

  @Get('templates')
  templates() {
    return this.service.listTemplates();
  }

  @Post('preview')
  preview(@CurrentUser() user: AuthenticatedUser, @Body() dto: PreviewExportDto) {
    return this.service.preview(user.id, dto.templateCode, dto.rootPersonId, dto.familyId);
  }

  @Post('jobs')
  createJob(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExportJobDto) {
    return this.service.createJob(user.id, dto.templateCode, dto.rootPersonId, dto.familyId);
  }

  @Get('jobs')
  listJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listJobs(user.id);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getJob(id, user.id);
  }
}
