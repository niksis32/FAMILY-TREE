import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  ExternalArchiveImportedSource,
  ExternalArchiveProviderId,
  ExternalArchiveProviderSummary,
  ExternalArchiveRecordSummary,
  ExternalArchiveSearchJobSummary,
  ExternalArchiveSearchParams,
} from '@family/shared';
import {
  ARCHIVE_SEARCH_MONTHLY_QUOTA_FREE,
  ARCHIVE_SEARCH_MONTHLY_QUOTA_PRO,
} from '@family/shared';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { ArchiveComplianceService } from './archive-compliance.service';
import { ArchiveSearchQueueService } from './archive-search.queue';
import { ImportAsSourceService } from './import-as-source.service';
import type { ExternalArchiveSearchDto, ImportExternalRecordDto } from './external-archives.dto';
import { FamilySearchProvider } from './providers/familysearch.provider';
import type { ExternalRecordProvider } from './providers/external-record.provider';
import { CommercialContextService } from '../commercial/commercial-context.service';

@Injectable()
export class ExternalArchivesService {
  private readonly logger = new Logger(ExternalArchivesService.name);
  private readonly providers: Map<ExternalArchiveProviderId, ExternalRecordProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly compliance: ArchiveComplianceService,
    private readonly queue: ArchiveSearchQueueService,
    private readonly importAsSource: ImportAsSourceService,
    private readonly familySearch: FamilySearchProvider,
    private readonly commercial: CommercialContextService,
  ) {
    this.providers = new Map<ExternalArchiveProviderId, ExternalRecordProvider>([
      ['FAMILYSEARCH', this.familySearch],
    ]);
  }

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  async listProviders(): Promise<ExternalArchiveProviderSummary[]> {
    const fsDevMode = await this.familySearch.isDevMode();
    return this.compliance.listAllowedProviders().map((id) => {
      const provider = this.getProvider(id);
      return {
        id,
        label: provider.meta.label,
        attributionRequired: true,
        termsUrl: this.compliance.getTermsUrl(id),
        devMode: id === 'FAMILYSEARCH' ? fsDevMode : false,
      };
    });
  }

  async startSearch(dto: ExternalArchiveSearchDto, user: AuthenticatedUser) {
    this.compliance.assertProviderAllowed(dto.provider);
    const workspaceId = this.requireWorkspaceId();
    await this.assertArchiveQuota(workspaceId, user.id);

    const query: ExternalArchiveSearchParams = {
      givenName: dto.givenName,
      familyName: dto.familyName,
      birthYear: dto.birthYear,
      deathYear: dto.deathYear,
      place: dto.place,
      recordType: dto.recordType,
    };

    const search = await this.prisma.archiveSearch.create({
      data: {
        workspaceId,
        provider: dto.provider,
        status: 'QUEUED',
        query: query as Prisma.InputJsonValue,
        requestedById: user.id,
      },
    });

    const queued = await this.queue.enqueue(search.id);
    if (!queued.queued) {
      void this.executeSearch(search.id).catch((err) =>
        this.logger.error(`Inline archive search failed: ${err.message}`),
      );
    }

    return this.toSearchSummary(search, queued.queued);
  }

  async getSearch(searchId: string): Promise<ExternalArchiveSearchJobSummary> {
    const workspaceId = this.requireWorkspaceId();
    const search = await this.prisma.archiveSearch.findFirst({
      where: { id: searchId, workspaceId },
    });
    if (!search) throw new NotFoundException('Archive search not found');
    return this.toSearchSummary(search);
  }

  async getRecord(providerId: string, recordId: string): Promise<ExternalArchiveRecordSummary> {
    this.compliance.assertProviderAllowed(providerId);
    this.requireWorkspaceId();
    const provider = this.getProvider(providerId);
    return provider.getRecord(recordId);
  }

  async importRecord(dto: ImportExternalRecordDto) {
    this.compliance.assertProviderAllowed(dto.provider);
    this.requireWorkspaceId();

    if (dto.personId) {
      const person = await this.prisma.person.findFirst({
        where: { id: dto.personId, deletedAt: null },
        select: { id: true },
      });
      if (!person) throw new NotFoundException('Person not found');
    }

    const provider = this.getProvider(dto.provider);
    const record = await provider.getRecord(dto.recordId);
    return this.importAsSource.importRecord({
      record,
      personId: dto.personId,
      titleOverride: dto.title,
    });
  }

  async listImported(): Promise<ExternalArchiveImportedSource[]> {
    this.requireWorkspaceId();
    const rows = await this.prisma.source.findMany({
      where: {
        deletedAt: null,
        externalProvider: { not: null },
        externalRecordId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        externalProvider: true,
        externalRecordId: true,
        attributionText: true,
        url: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      externalProvider: row.externalProvider!,
      externalRecordId: row.externalRecordId!,
      attributionText: row.attributionText,
      url: row.url,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async executeSearch(searchId: string) {
    const search = await this.prisma.archiveSearch.findUnique({ where: { id: searchId } });
    if (!search) return;

    await this.prisma.archiveSearch.update({
      where: { id: searchId },
      data: { status: 'RUNNING' },
    });

    try {
      this.compliance.assertProviderAllowed(search.provider);
      const provider = this.getProvider(search.provider as ExternalArchiveProviderId);
      const params = search.query as ExternalArchiveSearchParams;
      const results = await provider.search(params);

      await this.prisma.archiveSearch.update({
        where: { id: searchId },
        data: {
          status: 'COMPLETED',
          results: results as unknown as Prisma.InputJsonValue,
          resultCount: results.length,
          completedAt: new Date(),
          error: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archive search failed';
      await this.prisma.archiveSearch.update({
        where: { id: searchId },
        data: {
          status: 'FAILED',
          error: message,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private getProvider(providerId: ExternalArchiveProviderId): ExternalRecordProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new BadRequestException(`Provider "${providerId}" is not registered`);
    }
    return provider;
  }

  async getQuotaUsage(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    const commercial = await this.commercial.resolveForUser(workspaceId, userId);
    const quota =
      commercial.planCode === 'PROFESSIONAL' ||
      commercial.planCode === 'ON_PREM' ||
      commercial.entitlements.features.reportExport
        ? ARCHIVE_SEARCH_MONTHLY_QUOTA_PRO
        : ARCHIVE_SEARCH_MONTHLY_QUOTA_FREE;

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const used = await this.prisma.archiveSearch.count({
      where: { workspaceId, createdAt: { gte: monthStart } },
    });

    return { quota, used, remaining: Math.max(0, quota - used) };
  }

  private async assertArchiveQuota(workspaceId: string, userId: string) {
    const usage = await this.getQuotaUsage(userId);
    if (usage.used >= usage.quota) {
      throw new ForbiddenException({
        code: 'ARCHIVE_QUOTA_EXCEEDED',
        message: `Monthly archive search quota exceeded (${usage.quota})`,
        quota: usage.quota,
        used: usage.used,
      });
    }
  }

  private toSearchSummary(
    search: {
      id: string;
      provider: string;
      status: string;
      query: unknown;
      results?: unknown;
      resultCount?: number | null;
      error?: string | null;
      createdAt: Date;
      completedAt?: Date | null;
    },
    queued = true,
  ): ExternalArchiveSearchJobSummary {
    return {
      id: search.id,
      provider: search.provider as ExternalArchiveProviderId,
      status: search.status as ExternalArchiveSearchJobSummary['status'],
      query: search.query as ExternalArchiveSearchParams,
      resultCount: search.resultCount,
      results: (search.results as ExternalArchiveRecordSummary[] | null) ?? undefined,
      error: search.error,
      queued,
      createdAt: search.createdAt.toISOString(),
      completedAt: search.completedAt?.toISOString() ?? null,
    };
  }
}
