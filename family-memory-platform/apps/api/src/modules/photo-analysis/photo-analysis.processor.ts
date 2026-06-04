import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GAMIFICATION_ACTIONS, isImageMimeType, PHOTO_ANALYSIS_QUEUE } from '@family/shared';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AiService } from '../ai/ai.service';
import { FaceTagsService } from '../face-tags/face-tags.service';
import { MediaService } from '../media/media.service';
import { GamificationActivityService } from '../gamification/gamification-activity.service';

export interface PhotoAnalysisJobPayload {
  jobId: string;
  mediaId: string;
  requestedBy?: string;
}

@Injectable()
export class PhotoAnalysisProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhotoAnalysisProcessor.name);
  private worker: Worker<PhotoAnalysisJobPayload> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly aiService: AiService,
    private readonly faceTagsService: FaceTagsService,
    private readonly gamification: GamificationActivityService,
  ) {}

  onModuleInit() {
    const url = this.redis.getUrl();
    if (!url) return;

    this.worker = new Worker<PhotoAnalysisJobPayload>(
      PHOTO_ANALYSIS_QUEUE,
      async (job) => this.handle(job),
      { connection: { url }, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Photo analysis job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handle(job: Job<PhotoAnalysisJobPayload>) {
    const { jobId, mediaId, requestedBy } = job.data;

    await this.prisma.photoAnalysisJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      const media = await this.prisma.media.findFirst({
        where: { id: mediaId, deletedAt: null },
      });
      if (!media || !isImageMimeType(media.mimeType)) {
        await this.finishJob(jobId, 'SKIPPED', 'Not an image media item');
        return;
      }

      if (this.config.get<string>('AI_SERVICE_ENABLED') !== 'true') {
        await this.finishJob(jobId, 'SKIPPED', 'AI service disabled');
        return;
      }

      if (!requestedBy) {
        await this.finishJob(jobId, 'SKIPPED', 'Photo analysis requires requesting user (AI consent).');
        return;
      }

      const audit = { userId: requestedBy, scope: { mediaId } };
      const download = await this.mediaService.createDownloadUrl(mediaId);

      const detectResult = await this.aiService.detectPhotoFaces(
        {
          mediaId,
          imageUrl: download.downloadUrl,
        },
        audit,
      );

      const detectData = this.aiService.extractData<{
        faces?: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          confidence: number;
          label?: string;
        }>;
      }>(detectResult);

      const existingTags = await this.prisma.photoFaceTag.count({ where: { mediaId } });
      if (existingTags === 0 && detectData?.faces?.length) {
        await this.faceTagsService.createManyAiDrafts(mediaId, detectData.faces, requestedBy);
      }

      const periodResult = await this.aiService.estimatePhotoPeriod(
        {
          mediaId,
          imageUrl: download.downloadUrl,
          takenAt: media.takenAt?.toISOString(),
        },
        audit,
      );

      const contextResult = await this.aiService.extractPhotoContext(
        {
          mediaId,
          imageUrl: download.downloadUrl,
        },
        audit,
      );

      const periodData = this.aiService.extractData<{
        estimatedYearFrom?: number;
        estimatedYearTo?: number;
        uncertaintyNotes?: string;
      }>(periodResult);
      const contextData = this.aiService.extractData<{
        detectedObjects?: unknown;
        detectedClothingStyle?: string;
        aiDescription?: string;
        uncertaintyNotes?: string;
      }>(contextResult);

      await this.prisma.photoInsight.upsert({
        where: { mediaId },
        create: {
          mediaId,
          estimatedYearFrom: periodData?.estimatedYearFrom,
          estimatedYearTo: periodData?.estimatedYearTo,
          detectedObjects: contextData?.detectedObjects as object | undefined,
          detectedClothingStyle: contextData?.detectedClothingStyle,
          aiDescription: contextData?.aiDescription,
          uncertaintyNotes: periodData?.uncertaintyNotes ?? contextData?.uncertaintyNotes,
        },
        update: {
          estimatedYearFrom: periodData?.estimatedYearFrom,
          estimatedYearTo: periodData?.estimatedYearTo,
          detectedObjects: contextData?.detectedObjects as object | undefined,
          detectedClothingStyle: contextData?.detectedClothingStyle,
          aiDescription: contextData?.aiDescription,
          uncertaintyNotes: periodData?.uncertaintyNotes ?? contextData?.uncertaintyNotes,
        },
      });

      await this.finishJob(jobId, 'COMPLETED');

      if (requestedBy) {
        await this.gamification.record({
          userId: requestedBy,
          action: GAMIFICATION_ACTIONS.PHOTO_ANALYSIS_COMPLETE,
          entityType: 'media',
          entityId: mediaId,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo analysis failed';
      await this.finishJob(jobId, 'FAILED', message);
      throw error;
    }
  }

  private async finishJob(jobId: string, status: 'COMPLETED' | 'FAILED' | 'SKIPPED', error?: string) {
    await this.prisma.photoAnalysisJob.update({
      where: { id: jobId },
      data: {
        status,
        error: error ?? null,
        completedAt: new Date(),
      },
    });
  }
}
