import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DOCUMENT_OCR_QUEUE, isOcrEligibleMimeType } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { SearchService } from '../search/search.service';
import { DocumentIntelligenceOcrRunnerService } from '../document-intelligence/document-intelligence-ocr-runner.service';

export interface DocumentOcrJobPayload {
  jobId: string;
  documentId: string;
  requestedBy?: string;
  language?: string;
}

@Injectable()
export class DocumentOcrProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentOcrProcessor.name);
  private worker: Worker<DocumentOcrJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ocrRunner: DocumentIntelligenceOcrRunnerService,
    private readonly search: SearchService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<DocumentOcrJobPayload>(
      DOCUMENT_OCR_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Document OCR job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<DocumentOcrJobPayload>) {
    const { jobId, documentId, language = 'ru', requestedBy } = job.data;

    await this.prisma.documentOcrJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      if (!requestedBy) {
        await this.finishJob(jobId, 'SKIPPED', 'Document OCR requires requesting user (AI consent).');
        return;
      }

      const document = await this.prisma.document.findFirst({
        where: { id: documentId, deletedAt: null },
      });
      if (!document) {
        await this.finishJob(jobId, 'SKIPPED', 'Document not found');
        return;
      }

      if (!isOcrEligibleMimeType(document.mimeType)) {
        await this.finishJob(jobId, 'SKIPPED', `MIME type not eligible for OCR: ${document.mimeType}`);
        return;
      }

      if (this.config.get<string>('AI_SERVICE_ENABLED') !== 'true') {
        await this.finishJob(jobId, 'SKIPPED', 'AI service disabled');
        return;
      }

      const { ocr, plainText } = await this.ocrRunner.runForJob(documentId, language, requestedBy);
      const ocrStatus =
        ocr && typeof ocr === 'object' && 'status' in ocr
          ? String((ocr as { status?: string }).status ?? '')
          : '';

      if (ocrStatus === 'error') {
        const message =
          ocr && typeof ocr === 'object' && 'message' in ocr
            ? String((ocr as { message?: string }).message ?? 'OCR failed')
            : 'OCR failed';
        await this.finishJob(jobId, 'FAILED', message);
        return;
      }

      if (!plainText && (ocrStatus === 'unavailable' || ocrStatus === 'hint')) {
        await this.finishJob(
          jobId,
          'SKIPPED',
          ocr && typeof ocr === 'object' && 'message' in ocr
            ? String((ocr as { message?: string }).message ?? 'OCR unavailable')
            : 'OCR unavailable — enable AI profile and Tesseract',
        );
        return;
      }

      await this.finishJob(jobId, 'COMPLETED');
      await this.search.indexDocument(documentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document OCR failed';
      await this.finishJob(jobId, 'FAILED', message);
      throw error;
    }
  }

  private async finishJob(jobId: string, status: 'COMPLETED' | 'FAILED' | 'SKIPPED', error?: string) {
    await this.prisma.documentOcrJob.update({
      where: { id: jobId },
      data: {
        status,
        error: error ?? null,
        completedAt: new Date(),
      },
    });
  }
}
