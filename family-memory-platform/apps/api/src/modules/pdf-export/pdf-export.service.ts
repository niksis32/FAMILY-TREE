import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDF_EXPORT_DOWNLOAD_TTL_SECONDS } from '@family/shared';
import { UsageMetric } from '@prisma/client';
import type { PdfExportTemplateCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { CommercialContextService } from '../commercial/commercial-context.service';
import { UsageMeterService } from '../commercial/usage-meter.service';
import { TreeViewDataService } from '../tree/tree-view-data.service';
import { ExportTemplateService } from './export-template.service';
import { PdfExportQueueService } from './pdf-export.queue';

@Injectable()
export class PdfExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly usage: UsageMeterService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly minio: MinioStorageService,
    private readonly templates: ExportTemplateService,
    private readonly treeViewData: TreeViewDataService,
    private readonly queue: PdfExportQueueService,
    private readonly config: ConfigService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = this.workspaceContext.getSnapshot().workspaceId;
    if (!workspaceId) throw new BadRequestException('X-Workspace-Id header required');
    return workspaceId;
  }

  listTemplates() {
    return this.templates.listTemplates();
  }

  async preview(userId: string, templateCode: PdfExportTemplateCode, rootPersonId?: string, familyId?: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.assertFeature(workspaceId, userId, 'reportExport');
    const html = await this.buildHtml(workspaceId, userId, templateCode, rootPersonId, familyId);
    return { templateCode, html };
  }

  async createJob(userId: string, templateCode: PdfExportTemplateCode, rootPersonId?: string, familyId?: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.assertFeature(workspaceId, userId, 'reportExport');
    await this.usage.assertWithinLimit(workspaceId, userId, UsageMetric.REPORT_EXPORTS);

    const previewHtml = await this.buildHtml(workspaceId, userId, templateCode, rootPersonId, familyId);
    const job = await this.prisma.pdfExportJob.create({
      data: {
        workspaceId,
        requestedById: userId,
        templateCode,
        rootPersonId,
        familyId,
        previewHtml,
        status: 'QUEUED',
      },
    });
    await this.queue.enqueue(job.id, workspaceId, userId);
    return this.mapJob(job);
  }

  async listJobs(userId: string) {
    const workspaceId = this.requireWorkspaceId();
    await this.context.resolveForUser(workspaceId, userId);
    const jobs = await this.prisma.pdfExportJob.findMany({
      where: { workspaceId, requestedById: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jobs.map((j) => this.mapJob(j));
  }

  async getJob(jobId: string, userId: string) {
    const job = await this.prisma.pdfExportJob.findFirst({
      where: { id: jobId, requestedById: userId },
    });
    if (!job) throw new NotFoundException('Export job not found');
    return this.mapJob(job);
  }

  async processJob(jobId: string) {
    const job = await this.prisma.pdfExportJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    await this.prisma.pdfExportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const html = job.previewHtml ?? (await this.buildHtml(
        job.workspaceId,
        job.requestedById,
        job.templateCode,
        job.rootPersonId ?? undefined,
        job.familyId ?? undefined,
      ));
      const pdfBuffer = await this.renderPdfBuffer(html, job.templateCode);
      const ext = job.templateCode === 'TREE_POSTER_A3' ? 'pdf' : 'pdf';
      const objectKey = `exports/pdf/${job.workspaceId}/${jobId}.${ext}`;
      const bucket = this.minio.documentsBucket;
      await this.minio.uploadBuffer(bucket, objectKey, pdfBuffer, 'application/pdf');

      const downloadUrl = await this.minio.presignedDownload(
        bucket,
        objectKey,
        PDF_EXPORT_DOWNLOAD_TTL_SECONDS,
      );
      const downloadExpiresAt = new Date(Date.now() + PDF_EXPORT_DOWNLOAD_TTL_SECONDS * 1000);

      await this.prisma.pdfExportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          objectKey,
          downloadUrl,
          downloadExpiresAt,
          completedAt: new Date(),
        },
      });
      await this.usage.increment(job.workspaceId, UsageMetric.REPORT_EXPORTS);
    } catch (error) {
      await this.prisma.pdfExportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'PDF export failed',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async buildHtml(
    workspaceId: string,
    userId: string,
    templateCode: PdfExportTemplateCode,
    rootPersonId?: string,
    familyId?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const branding = await this.prisma.workspaceBranding.findUnique({ where: { workspaceId } });
    const persons = await this.loadPersonRows(rootPersonId, familyId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    let treeData = null;
    const treeRootId = rootPersonId ?? (familyId ? persons[0]?.id : undefined);
    if (treeRootId && user) {
      try {
        treeData = await this.treeViewData.getViewData(treeRootId, { scope: 'full', depth: 6 }, {
          id: user.id,
          email: user.email,
          role: user.role,
        });
      } catch {
        treeData = null;
      }
    }

    return this.templates.buildHtml({
      templateCode,
      workspaceName: workspace?.name ?? 'Family Tree',
      title: branding?.displayName ?? workspace?.name ?? 'Family Book',
      persons,
      treeData,
      familyBranchName: familyId ? (await this.familyName(familyId)) : undefined,
      branding: branding
        ? {
            displayName: branding.displayName,
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
          }
        : undefined,
    });
  }

  private async familyName(familyId: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      select: { name: true },
    });
    return family?.name;
  }

  private async loadPersonRows(rootPersonId?: string, familyId?: string) {
    if (familyId) {
      const members = await this.prisma.familyMember.findMany({
        where: { familyId, deletedAt: null },
        include: {
          person: {
            select: {
              id: true,
              givenName: true,
              familyName: true,
              birthDate: true,
              deathDate: true,
              isLiving: true,
              privacyLevel: true,
            },
          },
        },
        take: 200,
      });
      return members
        .map((m) => m.person)
        .filter((p) => p && p.privacyLevel !== 'PRIVATE' && !p.isLiving)
        .map((p) => this.personRow(p!));
    }

    const rows = await this.prisma.person.findMany({
      where: { deletedAt: null, ...(rootPersonId ? { id: rootPersonId } : {}) },
      orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
      take: rootPersonId ? 1 : 200,
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthDate: true,
        deathDate: true,
      },
    });

    if (!rootPersonId && rows.length === 0) {
      const all = await this.prisma.person.findMany({
        where: { deletedAt: null },
        orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
        take: 200,
        select: {
          id: true,
          givenName: true,
          familyName: true,
          birthDate: true,
          deathDate: true,
        },
      });
      return all.map((p) => this.personRow(p));
    }

    return rows.map((p) => this.personRow(p));
  }

  private personRow(p: {
    id: string;
    givenName: string;
    familyName: string | null;
    birthDate: Date | null;
    deathDate: Date | null;
  }) {
    const displayName = [p.givenName, p.familyName].filter(Boolean).join(' ');
    return {
      id: p.id,
      displayName,
      birthYear: p.birthDate?.getFullYear() ?? null,
      deathYear: p.deathDate?.getFullYear() ?? null,
    };
  }

  private async renderPdfBuffer(html: string, templateCode: PdfExportTemplateCode): Promise<Buffer> {
    const executablePath =
      this.config.get<string>('PUPPETEER_EXECUTABLE_PATH') ??
      this.config.get<string>('CHROMIUM_PATH');

    if (!executablePath) {
      throw new ServiceUnavailableException(
        'PDF export requires PUPPETEER_EXECUTABLE_PATH or CHROMIUM_PATH',
      );
    }

    try {
      const puppeteer = await import('puppeteer-core');
      const browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        const pdf = await page.pdf({
          format: templateCode === 'TREE_POSTER_A3' ? 'A3' : templateCode === 'FAMILY_BOOK_A2' ? 'A2' : 'A4',
          landscape: templateCode === 'TREE_POSTER_A3',
          printBackground: true,
          margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`PDF generation failed: ${message}`);
    }
  }

  private mapJob(job: {
    id: string;
    workspaceId: string;
    templateCode: string;
    status: string;
    downloadUrl: string | null;
    downloadExpiresAt: Date | null;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      templateCode: job.templateCode,
      status: job.status,
      downloadUrl: job.downloadUrl,
      downloadExpiresAt: job.downloadExpiresAt?.toISOString() ?? null,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}
