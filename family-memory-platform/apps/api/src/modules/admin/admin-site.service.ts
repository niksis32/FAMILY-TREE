import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminUpdatePortalSettingsInput,
  AdminUpdateWorkspaceBrandingInput,
  AdminUpsertGlobalFeatureFlagInput,
  PortalGlobalFeatureFlagsResponse,
  PortalLocalesResponse,
  PortalSiteSettingsResponse,
  PortalSiteStatsResponse,
  PortalWorkspaceBrandingListResponse,
} from '@family/shared';
import { FeatureFlagScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_LANDING_COPY,
  GLOBAL_FEATURE_FLAG_KEYS,
  mapPortalSettings,
  parseLandingCopy,
  parseModuleToggles,
  PORTAL_SETTINGS_ID,
} from './portal-site.constants';

const LOCALE_LABELS: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
};

@Injectable()
export class AdminSiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<PortalSiteStatsResponse> {
    const [workspaceCount, brandedWorkspaces, globalFeatureFlags, settings] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.workspaceBranding.count({
        where: {
          OR: [
            { displayName: { not: null } },
            { primaryColor: { not: null } },
            { logoStorageKey: { not: null } },
            { customDomain: { not: null } },
          ],
        },
      }),
      this.prisma.featureFlag.count({ where: { scope: 'GLOBAL' } }),
      this.ensureSettings(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      workspaceCount,
      brandedWorkspaces,
      globalFeatureFlags,
      maintenanceMode: settings.maintenanceMode,
    };
  }

  async getSettings(): Promise<PortalSiteSettingsResponse> {
    const row = await this.ensureSettings();
    return mapPortalSettings(row);
  }

  async updateSettings(adminId: string, dto: AdminUpdatePortalSettingsInput): Promise<PortalSiteSettingsResponse> {
    await this.ensureSettings();
    const current = await this.prisma.portalSiteSettings.findUniqueOrThrow({ where: { id: PORTAL_SETTINGS_ID } });

    let landingCopy: ReturnType<typeof parseLandingCopy> | undefined;
    if (dto.landingCopy) {
      landingCopy = parseLandingCopy(current.landingCopy);
      for (const [locale, chunk] of Object.entries(dto.landingCopy)) {
        landingCopy[locale] = { ...landingCopy[locale], ...chunk };
      }
    }
    const modules = dto.modules
      ? { ...parseModuleToggles(current.modules), ...dto.modules }
      : undefined;

    const row = await this.prisma.portalSiteSettings.update({
      where: { id: PORTAL_SETTINGS_ID },
      data: {
        ...(dto.portalName !== undefined ? { portalName: dto.portalName } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor } : {}),
        ...(dto.secondaryColor !== undefined ? { secondaryColor: dto.secondaryColor } : {}),
        ...(dto.faviconUrl !== undefined ? { faviconUrl: dto.faviconUrl } : {}),
        ...(landingCopy ? { landingCopy: landingCopy as unknown as Prisma.InputJsonValue } : {}),
        ...(modules ? { modules: modules as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.defaultLocale !== undefined ? { defaultLocale: dto.defaultLocale } : {}),
        ...(dto.maintenanceMode !== undefined ? { maintenanceMode: dto.maintenanceMode } : {}),
        ...(dto.maintenanceMessage !== undefined ? { maintenanceMessage: dto.maintenanceMessage } : {}),
        updatedById: adminId,
      },
    });

    return mapPortalSettings(row);
  }

  async listWorkspaceBranding(params: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<PortalWorkspaceBrandingListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);
    const q = params.q?.trim();

    const where: Prisma.WorkspaceWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
        include: { branding: true },
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: workspaces.map((ws) => {
        const b = ws.branding;
        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          displayName: b?.displayName ?? null,
          primaryColor: b?.primaryColor ?? null,
          secondaryColor: b?.secondaryColor ?? null,
          customDomain: b?.customDomain ?? null,
          domainVerified: b?.domainVerified ?? false,
          hasLogo: Boolean(b?.logoStorageKey),
          updatedAt: b?.updatedAt.toISOString() ?? null,
        };
      }),
    };
  }

  async updateWorkspaceBranding(workspaceId: string, dto: AdminUpdateWorkspaceBrandingInput) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const branding = await this.prisma.workspaceBranding.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        displayName: dto.displayName,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        footerText: dto.footerText,
        faviconUrl: dto.faviconUrl ?? undefined,
      },
      update: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor } : {}),
        ...(dto.secondaryColor !== undefined ? { secondaryColor: dto.secondaryColor } : {}),
        ...(dto.footerText !== undefined ? { footerText: dto.footerText } : {}),
        ...(dto.faviconUrl !== undefined ? { faviconUrl: dto.faviconUrl } : {}),
      },
    });

    return {
      workspaceId,
      workspaceName: workspace.name,
      displayName: branding.displayName,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      footerText: branding.footerText,
      faviconUrl: branding.faviconUrl,
      updatedAt: branding.updatedAt.toISOString(),
    };
  }

  async listGlobalFeatureFlags(): Promise<PortalGlobalFeatureFlagsResponse> {
    const rows = await this.prisma.featureFlag.findMany({
      where: { scope: FeatureFlagScope.GLOBAL, workspaceId: null, userId: null },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));

    return {
      items: GLOBAL_FEATURE_FLAG_KEYS.map((key) => {
        const row = byKey.get(key);
        return {
          key,
          enabled: row?.enabled ?? false,
          id: row?.id ?? null,
          updatedAt: row?.updatedAt.toISOString() ?? null,
        };
      }),
    };
  }

  async upsertGlobalFeatureFlag(dto: AdminUpsertGlobalFeatureFlagInput) {
    if (!GLOBAL_FEATURE_FLAG_KEYS.includes(dto.key as (typeof GLOBAL_FEATURE_FLAG_KEYS)[number])) {
      throw new BadRequestException(`Unsupported feature flag key: ${dto.key}`);
    }

    const existing = await this.prisma.featureFlag.findFirst({
      where: {
        key: dto.key,
        scope: FeatureFlagScope.GLOBAL,
        workspaceId: null,
        userId: null,
      },
    });

    if (existing) {
      const row = await this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled: dto.enabled },
      });
      return { key: row.key, enabled: row.enabled, id: row.id };
    }

    const row = await this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        scope: FeatureFlagScope.GLOBAL,
        enabled: dto.enabled,
      },
    });
    return { key: row.key, enabled: row.enabled, id: row.id };
  }

  async listLocales(): Promise<PortalLocalesResponse> {
    const settings = await this.ensureSettings();
    const codes = ['ru', 'en'];
    return {
      defaultLocale: settings.defaultLocale,
      locales: codes.map((code) => ({
        code,
        label: LOCALE_LABELS[code] ?? code,
        isDefault: code === settings.defaultLocale,
      })),
    };
  }

  async getPublicConfig() {
    const row = await this.ensureSettings();
    const mapped = mapPortalSettings(row);
    return {
      portalName: mapped.portalName,
      tagline: mapped.tagline,
      primaryColor: mapped.primaryColor,
      secondaryColor: mapped.secondaryColor,
      faviconUrl: mapped.faviconUrl,
      landingCopy: mapped.landingCopy,
      modules: mapped.modules,
      defaultLocale: mapped.defaultLocale,
      maintenanceMode: mapped.maintenanceMode,
      maintenanceMessage: mapped.maintenanceMessage,
    };
  }

  private async ensureSettings() {
    return this.prisma.portalSiteSettings.upsert({
      where: { id: PORTAL_SETTINGS_ID },
      create: {
        id: PORTAL_SETTINGS_ID,
        landingCopy: DEFAULT_LANDING_COPY as unknown as Prisma.InputJsonValue,
      },
      update: {},
    });
  }
}
