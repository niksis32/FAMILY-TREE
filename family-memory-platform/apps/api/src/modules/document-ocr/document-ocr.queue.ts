import { Injectable, Logger } from '@nestjs/common';
import { DOCUMENT_OCR_QUEUE, isOcrEligibleMimeType } from '@family/shared';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { DocumentOcrJobPayload } from './document-ocr.processor';

@Injectable()
export class DocumentOcrQueueService {
  private readonly logger = new Logger(DocumentOcrQueueService.name);
  private queue: Queue<DocumentOcrJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getQueue(): Queue<DocumentOcrJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(DOCUMENT_OCR_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueueAfterUpload(documentId: string, mimeType: string, requestedBy?: string, language = 'ru') {
    if (!isOcrEligibleMimeType(mimeType)) return null;
    return this.enqueue(documentId, requestedBy, language);
  }

  async enqueue(documentId: string, requestedBy?: string, language = 'ru') {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!document) {
      return null;
    }

    const jobRecord = await this.prisma.documentOcrJob.create({
      data: {
        documentId,
        status: 'QUEUED',
        requestedBy,
        language,
      },
    });

    const queue = this.getQueue();
    if (!queue) {
      await this.prisma.documentOcrJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'SKIPPED',
          error: 'REDIS_URL is not configured — cannot enqueue document OCR',
          completedAt: new Date(),
        },
      });
      this.logger.warn('Document OCR skipped — Redis unavailable');
      return jobRecord;
    }

    await queue.add(
      'ocr',
      { jobId: jobRecord.id, documentId, requestedBy, language },
      {
        jobId: jobRecord.id,
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: 'exponential', delay: 8000 },
      },
    );

    return jobRecord;
  }

  async getLatestJob(documentId: string) {
    return this.prisma.documentOcrJob.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
