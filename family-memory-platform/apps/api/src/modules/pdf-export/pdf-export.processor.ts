import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PDF_EXPORT_QUEUE } from '@family/shared';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { PdfExportService } from './pdf-export.service';
import type { PdfExportJobPayload } from './pdf-export.queue';

@Injectable()
export class PdfExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfExportProcessor.name);
  private worker: Worker<PdfExportJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly exports: PdfExportService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<PdfExportJobPayload>(
      PDF_EXPORT_QUEUE,
      async (job) => this.exports.processJob(job.data.jobId),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`PDF export job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
