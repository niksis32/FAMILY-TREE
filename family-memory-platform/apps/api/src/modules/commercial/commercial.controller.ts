import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import {
  AcceptInviteDto,
  ChangePlanDto,
  CreateInviteDto,
  UpdateBillingEmailDto,
  UpdateConsentDto,
} from './commercial.dto';
import { CommercialService } from './commercial.service';
import { InvitesService } from './invites.service';
import { PrivacyService } from './privacy.service';
import { ExportService } from './export.service';

@ApiTags('commercial')
@ApiBearerAuth()
@Controller()
export class CommercialController {
  constructor(
    private readonly commercial: CommercialService,
    private readonly invites: InvitesService,
    private readonly privacy: PrivacyService,
    private readonly exportService: ExportService,
  ) {}

  @Get('subscription-plans')
  listPlans() {
    return this.commercial.listPlans();
  }

  @Get('workspaces/me')
  @UseGuards(JwtAuthGuard)
  async myWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    await this.commercial.ensurePrimaryWorkspace(user.id, user.email);
    return this.commercial.listMyWorkspaces(user.id);
  }

  @Get('workspaces/:workspaceId/commercial')
  @UseGuards(JwtAuthGuard)
  overview(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.getOverview(workspaceId, user.id);
  }

  @Get('workspaces/:workspaceId/members')
  @UseGuards(JwtAuthGuard)
  members(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.listMembers(workspaceId, user.id);
  }

  @Patch('workspaces/:workspaceId/subscription')
  @UseGuards(JwtAuthGuard)
  changePlan(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePlanDto,
  ) {
    return this.commercial.changePlan(workspaceId, user.id, dto.planCode);
  }

  @Patch('workspaces/:workspaceId/billing')
  @UseGuards(JwtAuthGuard)
  updateBilling(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBillingEmailDto,
  ) {
    return this.commercial.updateBillingEmail(workspaceId, user.id, dto.billingEmail);
  }

  @Get('workspaces/:workspaceId/invites')
  @UseGuards(JwtAuthGuard)
  listInvites(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invites.list(workspaceId, user.id);
  }

  @Post('workspaces/:workspaceId/invites')
  @UseGuards(JwtAuthGuard)
  createInvite(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invites.create(workspaceId, user.id, dto.email, dto.role ?? 'EDITOR');
  }

  @Post('workspaces/:workspaceId/invites/:inviteId/revoke')
  @UseGuards(JwtAuthGuard)
  revokeInvite(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invites.revoke(workspaceId, user.id, inviteId);
  }

  @Post('invites/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvite(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInviteDto) {
    return this.invites.accept(dto.token, user.id, user.email);
  }

  @Get('workspaces/:workspaceId/audit-logs')
  @UseGuards(JwtAuthGuard)
  auditLogs(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.listAuditLogs(workspaceId, user.id);
  }

  @Get('privacy/me')
  @UseGuards(JwtAuthGuard)
  privacyCenter(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.getCenter(user.id);
  }

  @Patch('privacy/consent')
  @UseGuards(JwtAuthGuard)
  updateConsent(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateConsentDto) {
    return this.privacy.updateConsent(user.id, dto.matchProfileOptIn);
  }

  @Post('privacy/export-request')
  @UseGuards(JwtAuthGuard)
  requestExport(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.createRequest(user.id, 'EXPORT');
  }

  @Post('privacy/delete-request')
  @UseGuards(JwtAuthGuard)
  requestDelete(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.createRequest(user.id, 'DELETE');
  }

  @Get('workspaces/:workspaceId/export/gdpr')
  @UseGuards(JwtAuthGuard)
  exportGdpr(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exportService.exportGdprBundle(workspaceId, user.id);
  }

  @Get('workspaces/:workspaceId/export/gedcom')
  @UseGuards(JwtAuthGuard)
  exportGedcom(
    @Param('workspaceId') workspaceId: string,
    @Query('familyId') familyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exportService.exportGedcom(workspaceId, user.id, familyId);
  }
}
