import { Injectable, NotFoundException } from '@nestjs/common';
import { WORKSPACE_EXPORT_DOWNLOAD_TTL_SECONDS } from '@family/shared';
import { createWriteStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { finished } from 'node:stream/promises';
import archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { ExportService } from '../commercial/export.service';
import { AccessControlService } from '../privacy/access-control.service';
import { LivingPersonPolicyService } from '../privacy/living-person-policy.service';
import { WorkspaceExportQueueService } from './workspace-export.queue';

@Injectable()
export class WorkspaceExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly exportService: ExportService,
    private readonly living: LivingPersonPolicyService,
    private readonly access: AccessControlService,
    private readonly minio: MinioStorageService,
    private readonly queue: WorkspaceExportQueueService,
  ) {}

  async requestExport(workspaceId: string, userId: string) {
    await this.context.resolveForUser(workspaceId, userId);
    const job = await this.prisma.workspaceExportJob.create({
      data: { workspaceId, requestedById: userId, status: 'QUEUED' },
    });
    await this.queue.enqueue(job.id, workspaceId, userId);
    return this.mapJob(job);
  }

  async getJob(jobId: string, userId: string) {
    const job = await this.prisma.workspaceExportJob.findFirst({
      where: { id: jobId, requestedById: userId },
    });
    if (!job) throw new NotFoundException('Export job not found');
    return this.mapJob(job);
  }

  async listJobs(workspaceId: string, userId: string) {
    await this.context.resolveForUser(workspaceId, userId);
    const jobs = await this.prisma.workspaceExportJob.findMany({
      where: { workspaceId, requestedById: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jobs.map((j) => this.mapJob(j));
  }

  async processJob(jobId: string) {
    const job = await this.prisma.workspaceExportJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    await this.prisma.workspaceExportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const bundle = await this.buildZipBundle(job.workspaceId, job.requestedById);
      const objectKey = `exports/${job.workspaceId}/${jobId}.zip`;
      const bucket = this.minio.documentsBucket;
      await this.minio.uploadBuffer(bucket, objectKey, bundle.buffer, 'application/zip');

      const downloadUrl = await this.minio.presignedDownload(
        bucket,
        objectKey,
        WORKSPACE_EXPORT_DOWNLOAD_TTL_SECONDS,
      );
      const downloadExpiresAt = new Date(Date.now() + WORKSPACE_EXPORT_DOWNLOAD_TTL_SECONDS * 1000);

      await this.prisma.workspaceExportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          objectKey,
          downloadUrl,
          downloadExpiresAt,
          manifest: bundle.manifest,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.workspaceExportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Export failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async buildZipBundle(workspaceId: string, userId: string) {
    const gdpr = await this.exportService.exportGdprBundle(workspaceId, userId);
    const families = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        members: { where: { deletedAt: null }, include: { person: true } },
      },
    });

    const media = await this.prisma.media.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, title: true, mimeType: true, storageKey: true, privacyLevel: true, personId: true, bucket: true },
    });
    const documents = await this.prisma.document.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, title: true, mimeType: true, storageKey: true, privacyLevel: true, personId: true, bucket: true },
    });

    const requester = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    const viewer = await this.access.viewerForWorkspace(requester, workspaceId);

    const exportableMedia: typeof media = [];
    for (const item of media) {
      const person = item.personId ? await this.access.loadPersonPolicy(item.personId) : null;
      if (this.access.canViewMediaRecord(item, viewer, person)) {
        exportableMedia.push(item);
      }
    }

    const exportableDocuments: typeof documents = [];
    for (const item of documents) {
      const person = item.personId ? await this.access.loadPersonPolicy(item.personId) : null;
      if (this.access.canViewDocumentRecord(item, viewer, person)) {
        exportableDocuments.push(item);
      }
    }

    const redactedPersons = gdpr.persons
      .map((p) =>
        this.living.redactPersonForExport({
          ...p,
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          deathDate: p.deathDate ? new Date(p.deathDate) : null,
          isLiving: true,
          privacyLevel: p.privacyLevel ?? 'PRIVATE',
        }),
      )
      .filter(Boolean);

    const manifest = {
      exportedAt: new Date().toISOString(),
      workspaceId,
      families: families.map((f) => ({ id: f.id, name: f.name, memberCount: f.members.length })),
      persons: redactedPersons.length,
      mediaManifest: exportableMedia.map((m) => ({
        id: m.id,
        title: m.title,
        mimeType: m.mimeType,
        storageKey: m.storageKey,
        privacyLevel: m.privacyLevel,
        zipPath: `media/${m.id}${this.fileExtension(m.mimeType, m.title)}`,
      })),
      documentsManifest: exportableDocuments.map((d) => ({
        id: d.id,
        title: d.title,
        mimeType: d.mimeType,
        storageKey: d.storageKey,
        privacyLevel: d.privacyLevel,
        zipPath: `documents/${d.id}${this.fileExtension(d.mimeType, d.title)}`,
      })),
      mediaBinariesIncluded: exportableMedia.length,
      documentBinariesIncluded: exportableDocuments.length,
    };

    const gedcomFiles: Array<{ name: string; content: string }> = [];
    for (const family of families) {
      const result = await this.exportService.exportGedcom(workspaceId, userId, family.id);
      if ('gedcomText' in result && result.gedcomText) {
        gedcomFiles.push({ name: result.fileName ?? `${family.id}.ged`, content: result.gedcomText });
      }
    }

    const zipPath = join(tmpdir(), `workspace-export-${randomUUID()}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.append(JSON.stringify({ ...gdpr, persons: redactedPersons }, null, 2), { name: 'gdpr-bundle.json' });
    for (const ged of gedcomFiles) {
      archive.append(ged.content, { name: `gedcom/${ged.name}` });
    }
    archive.append(JSON.stringify(manifest.mediaManifest, null, 2), { name: 'media-manifest.json' });
    archive.append(JSON.stringify(manifest.documentsManifest, null, 2), { name: 'documents-manifest.json' });

    for (const item of exportableMedia) {
      try {
        const buffer = await this.minio.downloadBuffer(item.bucket ?? this.minio.mediaBucket, item.storageKey);
        archive.append(buffer, { name: `media/${item.id}${this.fileExtension(item.mimeType, item.title)}` });
      } catch {
        // Skip missing objects — manifest still lists metadata
      }
    }

    for (const item of exportableDocuments) {
      try {
        const buffer = await this.minio.downloadBuffer(item.bucket ?? this.minio.documentsBucket, item.storageKey);
        archive.append(buffer, { name: `documents/${item.id}${this.fileExtension(item.mimeType, item.title)}` });
      } catch {
        // Skip missing objects
      }
    }

    await archive.finalize();
    await finished(output);

    const buffer = await fs.readFile(zipPath);
    await fs.unlink(zipPath).catch(() => undefined);
    return { buffer, manifest };
  }

  private fileExtension(mimeType: string, title?: string | null): string {
    const fromTitle = title?.match(/\.[a-zA-Z0-9]+$/)?.[0];
    if (fromTitle) return fromTitle;
    if (mimeType.includes('jpeg') || mimeType === 'image/jpg') return '.jpg';
    if (mimeType.includes('png')) return '.png';
    if (mimeType.includes('webp')) return '.webp';
    if (mimeType.includes('pdf')) return '.pdf';
    if (mimeType.includes('gif')) return '.gif';
    return '';
  }

  private mapJob(job: {
    id: string;
    workspaceId: string;
    status: string;
    downloadUrl: string | null;
    downloadExpiresAt: Date | null;
    error: string | null;
    manifest?: unknown;
    createdAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      status: job.status,
      downloadUrl: job.downloadUrl,
      downloadExpiresAt: job.downloadExpiresAt?.toISOString() ?? null,
      error: job.error,
      manifest: job.manifest ?? null,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}
