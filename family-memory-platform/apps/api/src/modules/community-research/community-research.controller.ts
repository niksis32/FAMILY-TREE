import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResearchRequestStatus } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateResearchRequestDto,
  UpdateResearchRequestStatusDto,
  UpsertResearcherProfileDto,
} from './community-research.dto';
import { CommunityResearchService } from './community-research.service';

@ApiTags('community-research')
@Controller('community')
export class CommunityResearchController {
  constructor(private readonly research: CommunityResearchService) {}

  @Get('research-requests')
  list(@Query('status') status?: ResearchRequestStatus) {
    return this.research.list(status);
  }

  @Post('research-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  create(@Body() dto: CreateResearchRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.research.create(user.id, dto);
  }

  @Patch('research-requests/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateResearchRequestStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.research.updateStatus(id, user.id, isAdmin, dto);
  }

  @Get('profiles/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  myProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.research.getProfile(user.id);
  }

  @Post('profiles/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  upsertMyProfile(@Body() dto: UpsertResearcherProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.research.upsertProfile(user.id, dto);
  }

  @Get('profiles/:userId')
  publicProfile(@Param('userId') userId: string) {
    return this.research.publicProfileByUserId(userId);
  }
}
