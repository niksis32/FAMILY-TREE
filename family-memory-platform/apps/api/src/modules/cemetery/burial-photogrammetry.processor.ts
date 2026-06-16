import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { BURIAL_PHOTOGRAMMETRY_QUEUE } from '@family/shared';
import { RedisService } from '../../common/redis/redis.service';
import { CemeteryService } from './cemetery.service';

@Injectable()
export class BurialPhotogrammetryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BurialPhotogrammetryProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly cemetery: CemeteryService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) {
      this.logger.warn('Burial photogrammetry worker disabled — Redis unavailable');
      return;
    }

    this.worker = new Worker(
      BURIAL_PHOTOGRAMMETRY_QUEUE,
      async (job) => {
        await this.cemetery.processPhotogrammetryJob(job.data.jobId);
      },
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Photogrammetry job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
