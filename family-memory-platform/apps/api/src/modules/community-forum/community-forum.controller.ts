import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateForumPostDto,
  CreateForumThreadDto,
  ForumPaginationQueryDto,
} from './community-forum.dto';
import { CommunityForumService } from './community-forum.service';

@ApiTags('community-forum')
@Controller('community')
export class CommunityForumController {
  constructor(private readonly forum: CommunityForumService) {}

  @Get('groups/:groupId/threads')
  listThreads(
    @Param('groupId') groupId: string,
    @Query() query: ForumPaginationQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.forum.listThreads(groupId, query, user?.id);
  }

  @Post('groups/:groupId/threads')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  createThread(
    @Param('groupId') groupId: string,
    @Body() dto: CreateForumThreadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forum.createThread(groupId, user.id, dto);
  }

  @Get('threads/:threadId')
  getThread(@Param('threadId') threadId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.forum.getThread(threadId, user?.id);
  }

  @Get('threads/:threadId/posts')
  listPosts(
    @Param('threadId') threadId: string,
    @Query() query: ForumPaginationQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.forum.listPosts(threadId, query, user?.id);
  }

  @Post('threads/:threadId/posts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  createPost(
    @Param('threadId') threadId: string,
    @Body() dto: CreateForumPostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forum.createPost(threadId, user.id, dto);
  }

  @Post('posts/:postId/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  markHelpful(@Param('postId') postId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.forum.markHelpful(postId, user.id);
  }

  @Post('posts/:postId/expert-answer')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  setExpert(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.forum.setExpertAnswer(postId, user.id, isAdmin);
  }
}
