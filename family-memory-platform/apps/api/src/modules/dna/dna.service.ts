import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseDnaFileContent } from '@family/dna-core';
import type { DnaProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { DnaConsentService } from './dna-consent.service';
import { DnaImportQueueService } from './dna-import.queue';

const ALLOWED_DNA_EXTENSIONS = ['.txt', '.csv', '.zip'];

@Injectable()
export class DnaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly minio: MinioStorageService,
    private readonly consent: DnaConsentService,
    private readonly queue: DnaImportQueueService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  async createUploadUrl(userId: string, fileName: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    await this.consent.assertImportConsent(userId);

    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_DNA_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Unsupported DNA file extension: ${ext}`);
    }

    const storageKey = this.minio.buildObjectKey('dna', `dna-${userId}-${fileName}`);
    const bucket = this.minio.dnaBucket;
    const client = this.minio.createClient();
    const uploadUrl = await client.presignedPutObject(bucket, storageKey, 60 * 60);

    return {
      bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 60 * 60,
      disclaimer: this.consent.disclaimer(),
    };
  }

  async createImportJob(userId: string, fileKey: string, fileName: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    await this.consent.assertImportConsent(userId);

    const job = await this.prisma.dnaImportJob.create({
      data: {
        workspaceId,
        userId,
        fileKey,
        fileName,
        status: 'QUEUED',
      },
    });
    await this.queue.enqueue(job.id, workspaceId, userId);
    return this.mapImportJob(job);
  }

  async getProfile(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);

    const profile = await this.prisma.dnaProfile.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!profile) {
      throw new NotFoundException('DNA profile not found');
    }
    return this.mapProfile(profile);
  }

  async deleteProfile(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);

    const profile = await this.prisma.dnaProfile.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!profile) {
      throw new NotFoundException('DNA profile not found');
    }

    await this.prisma.dnaProfile.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return { deleted: true, disclaimer: this.consent.disclaimer() };
  }

  async grantConsent(userId: string) {
    return this.consent.grantImportConsent(userId);
  }

  async processImportJob(jobId: string) {
    const job = await this.prisma.dnaImportJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    await this.prisma.dnaImportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const client = this.minio.createClient();
      const url = await client.presignedGetObject(this.minio.dnaBucket, job.fileKey, 300);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download DNA file: ${response.status}`);
      }
      const content = await response.text();
      const parsed = parseDnaFileContent(content);

      await this.prisma.dnaProfile.upsert({
        where: { workspaceId_userId: { workspaceId: job.workspaceId, userId: job.userId } },
        create: {
          workspaceId: job.workspaceId,
          userId: job.userId,
          provider: parsed.provider as DnaProvider,
          snpCount: parsed.snpCount,
          fileKey: job.fileKey,
          fileName: job.fileName,
          importedAt: new Date(),
        },
        update: {
          provider: parsed.provider as DnaProvider,
          snpCount: parsed.snpCount,
          fileKey: job.fileKey,
          fileName: job.fileName,
          importedAt: new Date(),
        },
      });

      await this.prisma.dnaImportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          provider: parsed.provider as DnaProvider,
          snpCount: parsed.snpCount,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.dnaImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'DNA import failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private mapProfile(profile: {
    provider: DnaProvider;
    snpCount: number;
    fileName: string | null;
    importedAt: Date | null;
    updatedAt: Date;
  }) {
    return {
      provider: profile.provider,
      snpCount: profile.snpCount,
      fileName: profile.fileName,
      importedAt: profile.importedAt?.toISOString() ?? null,
      updatedAt: profile.updatedAt.toISOString(),
      disclaimer: this.consent.disclaimer(),
      note: 'Genetic data is used for family matching research only. No health or trait analysis is provided.',
    };
  }

  private mapImportJob(job: {
    id: string;
    status: string;
    fileName: string;
    provider: DnaProvider | null;
    snpCount: number | null;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      provider: job.provider,
      snpCount: job.snpCount,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      disclaimer: this.consent.disclaimer(),
    };
  }
}
