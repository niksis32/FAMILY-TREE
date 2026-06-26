import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MEDIA_TRANSCRIPT_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { MemoryStoriesService } from './memory-stories.service';

interface TranscriptJobPayload {
  jobId: string;
  mediaId: string;
  memoryStoryId: string;
  language: string;
  requestedBy?: string;
}

@Injectable()
export class MediaTranscriptProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaTranscriptProcessor.name);
  private worker: Worker<TranscriptJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly memoryStories: MemoryStoriesService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<TranscriptJobPayload>(
      MEDIA_TRANSCRIPT_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Media transcript job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<TranscriptJobPayload>) {
    const { jobId, mediaId, memoryStoryId, language, requestedBy } = job.data;
    await this.memoryStories.processTranscriptInline(
      jobId,
      mediaId,
      memoryStoryId,
      language,
      requestedBy,
    );
  }
}
