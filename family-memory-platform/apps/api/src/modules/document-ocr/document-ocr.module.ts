import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentIntelligenceModule } from '../document-intelligence/document-intelligence.module';
import { SearchModule } from '../search/search.module';
import { DocumentOcrController } from './document-ocr.controller';
import { DocumentOcrProcessor } from './document-ocr.processor';
import { DocumentOcrQueueService } from './document-ocr.queue';

/** Async document OCR pipeline (BullMQ) — auto after upload, manual re-run via enqueue. */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    forwardRef(() => DocumentIntelligenceModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [DocumentOcrController],
  providers: [DocumentOcrQueueService, DocumentOcrProcessor],
  exports: [DocumentOcrQueueService],
})
export class DocumentOcrModule {}
