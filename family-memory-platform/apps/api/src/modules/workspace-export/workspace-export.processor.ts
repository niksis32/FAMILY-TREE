import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WORKSPACE_EXPORT_QUEUE } from '@family/shared';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { WorkspaceExportService } from './workspace-export.service';
import type { WorkspaceExportJobPayload } from './workspace-export.queue';

@Injectable()
export class WorkspaceExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceExportProcessor.name);
  private worker: Worker<WorkspaceExportJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly exports: WorkspaceExportService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<WorkspaceExportJobPayload>(
      WORKSPACE_EXPORT_QUEUE,
      async (job) => this.exports.processJob(job.data.jobId),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Workspace export job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
