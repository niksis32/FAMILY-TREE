import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateMediaCommentDto,
  UpdateMediaCommentDto,
  UpsertPhotoInsightDto,
} from './person-photo-links.dto';
import { PersonPhotoLinksService } from './person-photo-links.service';

@ApiTags('person-photo-links')
@ApiBearerAuth()
@Controller()
export class PersonPhotoLinksController {
  constructor(private readonly service: PersonPhotoLinksService) {}
  @Get('media/:mediaId/workspace')
  workspace(@Param('mediaId') mediaId: string) {
    return this.service.getWorkspace(mediaId);
  }

  @Get('media/:mediaId/suggest-person')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  suggestPerson(
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('faceTagId') faceTagId?: string,
  ) {
    return this.service.suggestMatches(mediaId, user, faceTagId);
  }

  @Patch('media/:mediaId/insight')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  upsertInsight(@Param('mediaId') mediaId: string, @Body() dto: UpsertPhotoInsightDto) {
    return this.service.upsertInsight(mediaId, dto);
  }

  @Get('media/:mediaId/comments')
  listComments(@Param('mediaId') mediaId: string) {
    return this.service.listComments(mediaId);
  }

  @Post('media/:mediaId/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  addComment(
    @Param('mediaId') mediaId: string,
    @Body() dto: CreateMediaCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addComment(mediaId, user.id, dto.body);
  }

  @Patch('media/comments/:commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateMediaCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateComment(commentId, user.id, dto.body);
  }

  @Delete('media/comments/:commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  removeComment(@Param('commentId') commentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeComment(commentId, user.id, user.role);
  }
}
