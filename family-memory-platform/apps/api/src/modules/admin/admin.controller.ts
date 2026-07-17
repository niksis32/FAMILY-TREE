import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApproveMilitaryConflictDto } from '../military-history/military-history.dto';
import { AdminApplyMessengerSanctionDto, AdminCreateUserDto, AdminHideMessageDto, AdminResolveMessageReportDto, AdminRevokeSessionDto, AdminSoftDeleteUserDto, AdminUpdatePortalSettingsDto, AdminUpdateUserDto, AdminUpdateWorkspaceBrandingDto, AdminUpsertGlobalFeatureFlagDto } from './admin.dto';
import { AdminMessagesService } from './admin-messages.service';
import { AdminOpsService } from './admin-ops.service';
import { AdminSessionsService } from './admin-sessions.service';
import { AdminSiteService } from './admin-site.service';
import { AdminService } from './admin.service';
import { PortalPublicController } from './portal-public.controller';
import { MilitaryHistoryService } from '../military-history/military-history.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly ops: AdminOpsService,
    private readonly sessions: AdminSessionsService,
    private readonly messages: AdminMessagesService,
    private readonly site: AdminSiteService,
    private readonly military: MilitaryHistoryService,
  ) {}

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('ops')
  opsOverview() {
    return this.ops.getOverview();
  }

  @Get('users')
  listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    return this.service.listUsers(
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    );
  }

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateUser(id, dto, user.id);
  }

  @Post('users/:id/soft-delete')
  softDeleteUser(
    @Param('id') id: string,
    @Body() dto: AdminSoftDeleteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.softDeleteUser(id, dto, user.id);
  }

  @Get('sessions/stats')
  sessionStats() {
    return this.sessions.getStats();
  }

  @Get('sessions')
  listSessions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.sessions.listSessions({
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
      userId: userId || undefined,
      activeOnly: activeOnly === 'false' ? false : true,
    });
  }

  @Get('sessions/login-events')
  listLoginEvents(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
    @Query('suspiciousOnly') suspiciousOnly?: string,
  ) {
    return this.sessions.listLoginEvents({
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
      userId: userId || undefined,
      suspiciousOnly: suspiciousOnly === 'true',
    });
  }

  @Post('sessions/:sessionId/revoke')
  revokeSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: AdminRevokeSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessions.revokeSession(sessionId, user.id, dto.reason);
  }

  @Post('sessions/users/:userId/revoke-all')
  revokeAllUserSessions(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sessions.revokeAllForUser(userId, user.id, user.sessionJti);
  }

  @Get('messages/stats')
  messageStats() {
    return this.messages.getStats();
  }

  @Get('messages/conversations')
  searchConversations(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.messages.searchConversations({
      q,
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
    });
  }

  @Get('messages/conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.messages.getConversation(id);
  }

  @Get('messages/conversations/:id/messages')
  listConversationMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.messages.listMessages(id, {
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get('messages/conversations/:id/export')
  exportConversation(@Param('id') id: string) {
    return this.messages.exportConversation(id);
  }

  @Get('messages/reports')
  listMessageReports(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: 'OPEN' | 'UNDER_REVIEW' | 'ALL',
  ) {
    return this.messages.listMessageReports({
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
      status,
    });
  }

  @Post('messages/reports/:reportId/resolve')
  resolveMessageReport(
    @Param('reportId') reportId: string,
    @Body() dto: AdminResolveMessageReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.resolveReport(reportId, user.id, dto);
  }

  @Post('messages/:messageId/hide')
  hideMessage(
    @Param('messageId') messageId: string,
    @Body() dto: AdminHideMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.hideMessage(messageId, user.id, dto.reason);
  }

  @Get('messages/sanctions')
  listSanctions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.messages.listSanctions({
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
      activeOnly: activeOnly === 'false' ? false : true,
    });
  }

  @Post('messages/sanctions')
  applySanction(@Body() dto: AdminApplyMessengerSanctionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.applySanction(user.id, dto);
  }

  @Post('messages/sanctions/:sanctionId/revoke')
  revokeSanction(@Param('sanctionId') sanctionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.revokeSanction(sanctionId, user.id);
  }

  @Get('site/stats')
  siteStats() {
    return this.site.getStats();
  }

  @Get('site/settings')
  siteSettings() {
    return this.site.getSettings();
  }

  @Patch('site/settings')
  updateSiteSettings(@Body() dto: AdminUpdatePortalSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.site.updateSettings(user.id, dto);
  }

  @Get('site/workspaces')
  listWorkspaceBranding(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.site.listWorkspaceBranding({
      q,
      limit: Number.isFinite(Number(limit)) ? Number.parseInt(limit!, 10) : undefined,
      offset: Number.isFinite(Number(offset)) ? Number.parseInt(offset!, 10) : undefined,
    });
  }

  @Patch('site/workspaces/:workspaceId/branding')
  updateWorkspaceBranding(@Param('workspaceId') workspaceId: string, @Body() dto: AdminUpdateWorkspaceBrandingDto) {
    return this.site.updateWorkspaceBranding(workspaceId, dto);
  }

  @Get('site/feature-flags')
  listGlobalFeatureFlags() {
    return this.site.listGlobalFeatureFlags();
  }

  @Put('site/feature-flags')
  upsertGlobalFeatureFlag(@Body() dto: AdminUpsertGlobalFeatureFlagDto) {
    return this.site.upsertGlobalFeatureFlag(dto);
  }

  @Get('site/locales')
  listLocales() {
    return this.site.listLocales();
  }

  @Get('moderation/queue-stats')
  moderationQueueStats(@CurrentUser() user: AuthenticatedUser) {
    return this.military.getModerationQueueStats(user.id);
  }

  @Get('moderation/military-conflicts/pending')
  listPendingMilitaryConflicts(@CurrentUser() user: AuthenticatedUser) {
    return this.military.listAllPendingForPlatformAdmin(user.id);
  }

  @Patch('moderation/military-conflicts/:id/approve')
  approveMilitaryConflict(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveMilitaryConflictDto,
  ) {
    return this.military.approveConflict(user.id, id, dto);
  }

  @Patch('moderation/military-conflicts/:id/reject')
  rejectMilitaryConflict(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.military.rejectConflict(user.id, id);
  }
}
