import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SOCIAL_ARCHIVE_IMPORT_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import type {
  ConfirmSocialImportDto,
  CreateSocialImportDto,
  UpdateSocialImportSelectionDto,
} from './social-archive-import.dto';

type ManifestItem = {
  externalId: string;
  kind?: string;
  title?: string;
  caption?: string;
  takenAt?: string;
  stagingMediaKey?: string;
  privacyFlags?: string[];
};

@Injectable()
export class SocialArchiveImportService {
  private queue: Queue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly minio: MinioStorageService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  private getQueue(): Queue | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(SOCIAL_ARCHIVE_IMPORT_QUEUE, { connection: { url } });
    return this.queue;
  }

  async listImports() {
    const workspaceId = this.requireWorkspaceId();
    return this.prisma.socialArchiveImport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getImport(id: string) {
    const workspaceId = this.requireWorkspaceId();
    const row = await this.prisma.socialArchiveImport.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException('Import not found');
    return row;
  }

  async createImport(dto: CreateSocialImportDto, user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const importRow = await this.prisma.socialArchiveImport.create({
      data: {
        workspaceId,
        provider: dto.provider ?? 'UNKNOWN',
        status: dto.manifestItems?.length ? 'PREVIEW_READY' : 'UPLOADED',
        fileName: dto.fileName,
        stagingKey: dto.stagingKey ?? `staging/${workspaceId}/${Date.now()}`,
        sizeBytes: dto.sizeBytes ?? 0,
        parsedCount: dto.manifestItems?.length ?? 0,
        expiresAt,
        createdById: user.id,
      },
    });

    if (dto.manifestItems?.length) {
      await this.stageItems(importRow.id, workspaceId, dto.manifestItems);
    } else {
      const q = this.getQueue();
      if (q) {
        await q.add('parse', { importId: importRow.id });
      }
    }

    return importRow;
  }

  async stageItems(importId: string, workspaceId: string, items: ManifestItem[]) {
    await this.prisma.socialArchiveItem.createMany({
      data: items.map((item) => ({
        workspaceId,
        importId,
        externalId: item.externalId,
        kind: (item.kind?.toUpperCase() as never) ?? 'PHOTO',
        title: item.title,
        caption: item.caption,
        takenAt: item.takenAt ? new Date(item.takenAt) : undefined,
        stagingMediaKey: item.stagingMediaKey,
        privacyFlags: item.privacyFlags ?? [],
        status: 'STAGED',
        selected: false,
      })),
      skipDuplicates: true,
    });

    await this.prisma.socialArchiveImport.update({
      where: { id: importId },
      data: { status: 'PREVIEW_READY', parsedCount: items.length },
    });
  }

  async listItems(importId: string, cursor?: string, limit = 50) {
    const workspaceId = this.requireWorkspaceId();
    await this.getImport(importId);

    const items = await this.prisma.socialArchiveItem.findMany({
      where: { importId, workspaceId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      items: page.map((i: { id: string; externalId: string; kind: string; title: string | null; caption: string | null; takenAt: Date | null; selected: boolean; privacyFlags: unknown; status: string }) => ({
        id: i.id,
        externalId: i.externalId,
        kind: i.kind,
        title: i.title,
        caption: i.caption,
        takenAt: i.takenAt?.toISOString() ?? null,
        selected: i.selected,
        privacyFlags: (i.privacyFlags as string[]) ?? [],
        status: i.status,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  }

  async updateSelection(importId: string, dto: UpdateSocialImportSelectionDto) {
    const workspaceId = this.requireWorkspaceId();
    const imp = await this.getImport(importId);
    if (imp.status !== 'PREVIEW_READY') {
      throw new BadRequestException('Import is not ready for selection');
    }

    if (dto.all === true) {
      await this.prisma.socialArchiveItem.updateMany({
        where: { importId, workspaceId },
        data: { selected: dto.selected ?? true },
      });
    } else if (dto.itemIds?.length) {
      await this.prisma.socialArchiveItem.updateMany({
        where: { importId, workspaceId, id: { in: dto.itemIds } },
        data: { selected: dto.selected ?? true, status: 'SELECTED' },
      });
    }

    const selectedCount = await this.prisma.socialArchiveItem.count({
      where: { importId, workspaceId, selected: true },
    });

    await this.prisma.socialArchiveImport.update({
      where: { id: importId },
      data: { selectedCount },
    });

    return { selectedCount };
  }

  async confirmImport(importId: string, dto: ConfirmSocialImportDto, user: AuthenticatedUser) {
    const workspaceId = this.requireWorkspaceId();
    const imp = await this.prisma.socialArchiveImport.findFirst({
      where: { id: importId, workspaceId },
    });
    if (!imp) throw new NotFoundException('Import not found');
    if (imp.status !== 'PREVIEW_READY') {
      throw new BadRequestException('Import must be in PREVIEW_READY status');
    }

    const selected = await this.prisma.socialArchiveItem.findMany({
      where: { importId, workspaceId, selected: true, status: { in: ['STAGED', 'SELECTED'] } },
    });
    if (!selected.length) {
      throw new BadRequestException('No items selected for import');
    }

    await this.prisma.socialArchiveImport.update({
      where: { id: importId },
      data: { status: 'CONFIRMING' },
    });

    let imported = 0;
    const bucket = this.minio.mediaBucket;
    const provider = imp.provider.toLowerCase();

    for (const item of selected) {
      const storageKey =
        item.stagingMediaKey ?? this.minio.buildObjectKey('uploads', `${item.externalId}.jpg`);

      const existing = await this.prisma.media.findFirst({
        where: {
          workspaceId,
          importSource: provider,
          externalPostId: item.externalId,
          deletedAt: null,
        },
      });

      if (existing) {
        await this.prisma.socialArchiveItem.update({
          where: { id: item.id },
          data: { status: 'SKIPPED', committedMediaId: existing.id },
        });
        continue;
      }

      const media = await this.prisma.media.create({
        data: {
          workspaceId,
          title: item.title ?? item.caption?.slice(0, 120) ?? `Import ${item.externalId}`,
          mimeType: 'image/jpeg',
          storageKey,
          bucket,
          privacyLevel: dto.privacyLevel ?? 'PRIVATE',
          takenAt: item.takenAt,
          importSource: provider,
          externalPostId: item.externalId,
          personId: dto.defaultPersonId,
        },
      });

      await this.prisma.socialArchiveItem.update({
        where: { id: item.id },
        data: { status: 'IMPORTED', committedMediaId: media.id },
      });
      imported += 1;
    }

    await this.prisma.socialArchiveImport.update({
      where: { id: importId },
      data: { status: 'COMPLETED', importedCount: imported },
    });

    return { importedCount: imported, skipped: selected.length - imported };
  }

  async getUploadUrl(fileName: string) {
    const storageKey = this.minio.buildObjectKey('uploads', `staging/${fileName}`);
    const client = this.minio.createClient();
    const bucket = this.minio.mediaBucket;
    const uploadUrl = await client.presignedPutObject(bucket, storageKey, 60 * 60);
    return { bucket, storageKey, uploadUrl, expiresInSeconds: 3600 };
  }
}
