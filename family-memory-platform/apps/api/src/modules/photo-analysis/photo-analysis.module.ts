import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { FaceTagsModule } from '../face-tags/face-tags.module';
import { GamificationModule } from '../gamification/gamification.module';
import { MediaModule } from '../media/media.module';
import { PhotoAnalysisController } from './photo-analysis.controller';
import { PhotoAnalysisProcessor } from './photo-analysis.processor';
import { PhotoAnalysisQueueService } from './photo-analysis.queue';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => MediaModule),
    AiModule,
    FaceTagsModule,
    GamificationModule,
    AuthModule,
  ],
  controllers: [PhotoAnalysisController],
  providers: [PhotoAnalysisQueueService, PhotoAnalysisProcessor],
  exports: [PhotoAnalysisQueueService],
})
export class PhotoAnalysisModule {}
