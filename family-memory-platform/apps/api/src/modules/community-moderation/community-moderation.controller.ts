import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateModerationReportDto, ModerationResolveDto } from './community-moderation.dto';
import { CommunityModerationService } from './community-moderation.service';

@ApiTags('community-moderation')
@Controller('community/moderation')
export class CommunityModerationController {
  constructor(private readonly moderation: CommunityModerationService) {}

  @Post('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  create(@Body() dto: CreateModerationReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.moderation.createReport(user.id, dto);
  }

  @Get('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listOpen() {
    return this.moderation.listOpenReports();
  }

  @Post('reports/:id/resolve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  resolve(
    @Param('id') reportId: string,
    @Body() dto: ModerationResolveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderation.resolveReport(reportId, user.id, dto);
  }
}
