import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { PhotoAnalysisModule } from '../photo-analysis/photo-analysis.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/** Photo/video/audio upload — MinIO presigned URLs, metadata in PostgreSQL */
@Module({
  imports: [PrismaModule, AuthModule, GamificationModule, forwardRef(() => PhotoAnalysisModule)],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
