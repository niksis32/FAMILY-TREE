import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateFamilyStoryDto,
  GenerateNarrativeDto,
  UpdateFamilyStoryDto,
} from './family-stories.dto';
import { FamilyStoriesService } from './family-stories.service';

@ApiTags('family-stories')
@ApiBearerAuth()
@Controller('family-stories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class FamilyStoriesController {
  constructor(private readonly service: FamilyStoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOneForUser(id, user.id);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.previewForOwner(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateFamilyStoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFamilyStoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }

  @Post(':id/generate-narrative')
  generateNarrative(
    @Param('id') id: string,
    @Body() dto: GenerateNarrativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generateNarrative(id, user.id, dto);
  }

  @Post(':id/rotate-token')
  rotateToken(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.rotateToken(id, user.id);
  }

  @Post(':id/revoke-token')
  revokeToken(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.revokeToken(id, user.id);
  }

  @Post(':id/submit-for-review')
  submitForReview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submitForReview(id, user.id);
  }
}
