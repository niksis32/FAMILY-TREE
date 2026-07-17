import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateContextConversationDto,
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  SendMessageDto,
  ReportMessageDto,
} from './messenger.dto';
import { MessengerService } from './messenger.service';

@ApiTags('messenger')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessengerController {
  constructor(private readonly service: MessengerService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listConversations(user.id);
  }

  @Post('report-message/:messageId')
  reportMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportMessageDto,
  ) {
    return this.service.reportMessage(messageId, user.id, dto.category, dto.details);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getConversation(id, user.id);
  }

  @Get(':id/messages')
  messages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.listMessages(id, user.id, cursor);
  }

  @Post('direct')
  createDirect(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDirectConversationDto) {
    return this.service.createDirect(user.id, dto.participantUserId);
  }

  @Post('group')
  createGroup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupConversationDto) {
    return this.service.createGroup(user.id, dto.title, dto.participantUserIds);
  }

  @Post('context')
  createContext(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContextConversationDto) {
    return this.service.createContext(user.id, dto.contextType, dto.contextId, dto.title);
  }

  @Post(':id/messages')
  send(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(id, user.id, dto.body, dto.attachmentMediaIds);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markRead(id, user.id);
  }
}
