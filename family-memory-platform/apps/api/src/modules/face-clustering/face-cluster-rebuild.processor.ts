import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FACE_CLUSTER_REBUILD_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { FaceClusteringService } from './face-clustering.service';

interface RebuildPayload {
  workspaceId: string;
  requestedBy?: string;
}

@Injectable()
export class FaceClusterRebuildProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FaceClusterRebuildProcessor.name);
  private worker: Worker<RebuildPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly clustering: FaceClusteringService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<RebuildPayload>(
      FACE_CLUSTER_REBUILD_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Face cluster rebuild ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<RebuildPayload>) {
    await this.clustering.rebuildClustersInline(job.data.workspaceId);
  }
}
