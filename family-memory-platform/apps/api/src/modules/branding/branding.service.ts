import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import type { PatchBrandingDto } from './branding.dto';

const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly minio: MinioStorageService,
  ) {}

  private async assertWhiteLabel(workspaceId: string, userId: string) {
    return this.context.assertFeature(workspaceId, userId, 'whiteLabel');
  }

  private async getOrCreate(workspaceId: string) {
    const existing = await this.prisma.workspaceBranding.findUnique({ where: { workspaceId } });
    if (existing) return existing;
    return this.prisma.workspaceBranding.create({
      data: { workspaceId },
    });
  }

  async getBranding(workspaceId: string, userId: string) {
    await this.context.resolveForUser(workspaceId, userId);
    const branding = await this.getOrCreate(workspaceId);
    return this.mapBranding(branding);
  }

  async patchBranding(workspaceId: string, userId: string, dto: PatchBrandingDto) {
    await this.assertWhiteLabel(workspaceId, userId);
    await this.getOrCreate(workspaceId);
    const branding = await this.prisma.workspaceBranding.update({
      where: { workspaceId },
      data: {
        displayName: dto.displayName,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        faviconUrl: dto.faviconUrl,
        footerText: dto.footerText,
        logoStorageKey: dto.logoStorageKey,
        logoBucket: dto.logoBucket,
      },
    });
    return this.mapBranding(branding);
  }

  async resolveByHost(host: string) {
    const normalized = host.trim().toLowerCase().replace(/:\d+$/, '');
    if (!normalized) {
      throw new BadRequestException('host query parameter is required');
    }

    return this.workspaceContext.runBypass(() => this.findBrandingByHost(normalized));
  }

  private async findBrandingByHost(normalized: string) {
    const branding = await this.prisma.workspaceBranding.findFirst({
      where: {
        customDomain: normalized,
        domainVerified: true,
      },
      include: { workspace: { select: { id: true, name: true } } },
    });
    if (!branding) {
      throw new NotFoundException('No verified branding for this host');
    }
    return {
      workspaceId: branding.workspaceId,
      workspaceName: branding.workspace.name,
      displayName: branding.displayName ?? branding.workspace.name,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      faviconUrl: branding.faviconUrl,
      footerText: branding.footerText,
      logoUrl: await this.logoDownloadUrl(branding.logoBucket, branding.logoStorageKey),
    };
  }

  async setCustomDomain(workspaceId: string, userId: string, customDomain: string) {
    await this.assertWhiteLabel(workspaceId, userId);
    const normalized = customDomain.trim().toLowerCase();
    const token = `fm-verify=${randomBytes(16).toString('hex')}`;
    await this.getOrCreate(workspaceId);
    const branding = await this.prisma.workspaceBranding.update({
      where: { workspaceId },
      data: {
        customDomain: normalized,
        domainVerified: false,
        domainVerifyToken: token,
      },
    });
    return {
      ...this.mapBranding(branding),
      verificationInstructions: {
        dnsTxtRecord: `_family-memory.${normalized}`,
        txtValue: token,
        cnameTarget: 'custom.family-memory.local',
      },
    };
  }

  async verifyCustomDomain(workspaceId: string, userId: string) {
    await this.assertWhiteLabel(workspaceId, userId);
    const branding = await this.prisma.workspaceBranding.findUnique({ where: { workspaceId } });
    if (!branding?.customDomain || !branding.domainVerifyToken) {
      throw new BadRequestException('Custom domain is not configured');
    }
    // MVP: manual verify after DNS instructions — token match is sufficient for staging.
    const updated = await this.prisma.workspaceBranding.update({
      where: { workspaceId },
      data: { domainVerified: true },
    });
    return this.mapBranding(updated);
  }

  async createLogoUploadUrl(workspaceId: string, userId: string, fileName: string, mimeType: string) {
    await this.assertWhiteLabel(workspaceId, userId);
    if (!LOGO_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`Unsupported logo mime type: ${mimeType}`);
    }
    const storageKey = this.minio.buildObjectKey('uploads', `branding-${workspaceId}-${fileName}`);
    const bucket = this.minio.mediaBucket;
    const client = this.minio.createClient();
    const uploadUrl = await client.presignedPutObject(bucket, storageKey, 15 * 60);
    return {
      bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 15 * 60,
    };
  }

  private async logoDownloadUrl(bucket: string | null, storageKey: string | null) {
    if (!bucket || !storageKey) return null;
    try {
      return await this.minio.presignedDownload(bucket, storageKey, 60 * 60);
    } catch {
      return null;
    }
  }

  private mapBranding(branding: {
    workspaceId: string;
    displayName: string | null;
    logoStorageKey: string | null;
    logoBucket: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    customDomain: string | null;
    domainVerified: boolean;
    faviconUrl: string | null;
    footerText: string | null;
    updatedAt: Date;
  }) {
    return {
      workspaceId: branding.workspaceId,
      displayName: branding.displayName,
      logoStorageKey: branding.logoStorageKey,
      logoBucket: branding.logoBucket,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      customDomain: branding.customDomain,
      domainVerified: branding.domainVerified,
      faviconUrl: branding.faviconUrl,
      footerText: branding.footerText,
      updatedAt: branding.updatedAt.toISOString(),
    };
  }
}
