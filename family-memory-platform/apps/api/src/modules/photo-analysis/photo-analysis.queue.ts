import { Injectable, Logger } from '@nestjs/common';
import { isImageMimeType, PHOTO_ANALYSIS_QUEUE } from '@family/shared';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { PhotoAnalysisJobPayload } from './photo-analysis.processor';

@Injectable()
export class PhotoAnalysisQueueService {
  private readonly logger = new Logger(PhotoAnalysisQueueService.name);
  private queue: Queue<PhotoAnalysisJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getQueue(): Queue<PhotoAnalysisJobPayload> | null {
    if (this.queue) return this.queue;
    const url = this.redis.getUrl();
    if (!url) return null;
    this.queue = new Queue(PHOTO_ANALYSIS_QUEUE, { connection: { url } });
    return this.queue;
  }

  async enqueueAfterUpload(mediaId: string, mimeType: string, requestedBy?: string) {
    if (!isImageMimeType(mimeType)) return null;
    return this.enqueue(mediaId, requestedBy);
  }

  async enqueue(mediaId: string, requestedBy?: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    if (!media) {
      return null;
    }

    const jobRecord = await this.prisma.photoAnalysisJob.create({
      data: {
        mediaId,
        status: 'QUEUED',
        requestedBy,
      },
    });

    const queue = this.getQueue();
    if (!queue) {
      await this.prisma.photoAnalysisJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'SKIPPED',
          error: 'REDIS_URL is not configured — cannot enqueue photo analysis',
          completedAt: new Date(),
        },
      });
      this.logger.warn('Photo analysis skipped — Redis unavailable');
      return jobRecord;
    }

    await queue.add(
      'analyze',
      { jobId: jobRecord.id, mediaId, requestedBy },
      {
        jobId: jobRecord.id,
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return jobRecord;
  }

  async getLatestJob(mediaId: string) {
    return this.prisma.photoAnalysisJob.findFirst({
      where: { mediaId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
