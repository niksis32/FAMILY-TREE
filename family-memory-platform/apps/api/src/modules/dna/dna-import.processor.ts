import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DNA_IMPORT_QUEUE } from '@family/shared';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { DnaService } from './dna.service';
import type { DnaImportJobPayload } from './dna-import.queue';

@Injectable()
export class DnaImportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DnaImportProcessor.name);
  private worker: Worker<DnaImportJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly dna: DnaService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<DnaImportJobPayload>(
      DNA_IMPORT_QUEUE,
      async (job) => this.dna.processImportJob(job.data.jobId),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`DNA import job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
