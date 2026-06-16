import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateMemoryStoryDto,
  UpdateMemoryStoryDto,
  UpdateTranscriptDto,
} from './memory-stories.dto';
import { MemoryStoriesService } from './memory-stories.service';

@ApiTags('memory-stories')
@ApiBearerAuth()
@Controller('memory-stories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MemoryStoriesController {
  constructor(private readonly service: MemoryStoriesService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  list(@Query('personId') personId?: string) {
    return this.service.list(personId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  one(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateMemoryStoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateMemoryStoryDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/transcript')
  @Roles('ADMIN', 'EDITOR')
  updateTranscript(
    @Param('id') id: string,
    @Body() dto: UpdateTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateTranscript(id, dto, user);
  }

  @Post(':id/transcript/retry')
  @Roles('ADMIN', 'EDITOR')
  retryTranscript(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.retryTranscript(id, user);
  }
}
