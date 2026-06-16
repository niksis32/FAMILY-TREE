import { BadRequestException, Body, Controller, Get, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import {
  LogoUploadUrlDto,
  PatchBrandingDto,
  SetCustomDomainDto,
} from './branding.dto';
import { BrandingService } from './branding.service';
import { BrandingSslService } from './branding-ssl.service';

@ApiTags('branding')
@Controller('branding')
export class BrandingController {
  constructor(
    private readonly service: BrandingService,
    private readonly ssl: BrandingSslService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get('resolve')
  resolve(@Query('host') host?: string) {
    return this.service.resolveByHost(host ?? '');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  get(@CurrentUser() user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    return this.service.getBranding(workspaceId, user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  patch(@CurrentUser() user: AuthenticatedUser, @Body() dto: PatchBrandingDto) {
    const workspaceId = this.requireWorkspaceId();
    return this.service.patchBranding(workspaceId, user.id, dto);
  }

  @Put('custom-domain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setDomain(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetCustomDomainDto) {
    const workspaceId = this.requireWorkspaceId();
    return this.service.setCustomDomain(workspaceId, user.id, dto.customDomain);
  }

  @Post('custom-domain/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyDomain(@CurrentUser() user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    return this.service.verifyCustomDomain(workspaceId, user.id);
  }

  @Post('custom-domain/provision-ssl')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  provisionSsl(@CurrentUser() user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    return this.ssl.provisionCustomDomainSsl(workspaceId);
  }

  @Post('logo/upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logoUploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoUploadUrlDto) {
    const workspaceId = this.requireWorkspaceId();
    return this.service.createLogoUploadUrl(workspaceId, user.id, dto.fileName, dto.mimeType);
  }

  private requireWorkspaceId() {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) {
      throw new BadRequestException('X-Workspace-Id header required');
    }
    return workspaceId;
  }
}
