import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { PrivacyCenterService } from './privacy-center.service';
import { PublicLinkService } from './public-link.service';
import { PrivacyAuditService } from './privacy-audit.service';
import {
  CreatePublicShareDto,
  UpdatePersonPrivacyDto,
  UpdateTreePrivacyDto,
  UpdateUserConsentDto,
} from './privacy.dto';
import { CommercialService } from '../commercial/commercial.service';

@ApiTags('privacy')
@Controller()
export class PrivacyController {
  constructor(
    private readonly center: PrivacyCenterService,
    private readonly publicLinks: PublicLinkService,
    private readonly audit: PrivacyAuditService,
    private readonly commercial: CommercialService,
  ) {}

  @Get('privacy/security-center')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  securityCenter(@CurrentUser() user: AuthenticatedUser) {
    return this.center.getCenter(user.id);
  }

  @Patch('privacy/consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateConsent(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserConsentDto) {
    return this.center.updateConsent(user.id, dto.consentKey, dto.granted);
  }

  @Get('privacy/persons/:personId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  personSettings(@Param('personId') personId: string) {
    return this.center.getPersonSettings(personId);
  }

  @Patch('privacy/persons/:personId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updatePerson(
    @Param('personId') personId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePersonPrivacyDto,
  ) {
    return this.center.updatePersonSettings(personId, user.id, dto);
  }

  @Get('privacy/families/:familyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  treeSettings(@Param('familyId') familyId: string) {
    return this.center.getTreeSettings(familyId);
  }

  @Patch('privacy/families/:familyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateTree(
    @Param('familyId') familyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTreePrivacyDto,
  ) {
    return this.center.updateTreeSettings(familyId, user.id, dto);
  }

  @Get('privacy/public-shares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listShares(@CurrentUser() user: AuthenticatedUser) {
    return this.publicLinks.listForUser(user.id);
  }

  @Post('privacy/public-shares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createShare(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePublicShareDto) {
    return this.publicLinks.create({
      userId: user.id,
      workspaceId: dto.workspaceId,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      label: dto.label,
      hideLivingPersons: dto.hideLivingPersons,
      familyStoryId: dto.familyStoryId,
    });
  }

  @Post('privacy/public-shares/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeShare(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publicLinks.revoke(user.id, id);
  }

  @Get('privacy/access-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async accessLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    if (workspaceId) {
      await this.commercial.getOverview(workspaceId, user.id);
      const rows = await this.audit.listAccessLogs(workspaceId, 100);
      return rows.map((r) => ({
        id: r.id,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        userId: r.userId,
        workspaceId: r.workspaceId,
        publicShareId: r.publicShareId,
        ipHash: r.ipHash,
        createdAt: r.createdAt.toISOString(),
        metadata: (r.metadata as Record<string, unknown>) ?? null,
      }));
    }
    const rows = await this.audit.listUserAccessLogs(user.id, 100);
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      userId: r.userId,
      workspaceId: r.workspaceId,
      publicShareId: r.publicShareId,
      ipHash: r.ipHash,
      createdAt: r.createdAt.toISOString(),
      metadata: (r.metadata as Record<string, unknown>) ?? null,
    }));
  }

  @Post('privacy/account-delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  accountDelete(@CurrentUser() user: AuthenticatedUser) {
    return this.center.requestAccountDelete(user.id);
  }

  @Get('public/share/:token')
  resolvePublic(
    @Param('token') token: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.publicLinks.resolveByToken(token, ip, userAgent);
  }
}
