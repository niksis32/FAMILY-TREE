import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { GamificationModule } from '../gamification/gamification.module';
import { SearchModule } from '../search/search.module';
import { DocumentOcrModule } from '../document-ocr/document-ocr.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

/** Archive documents (PDF, scans) — MinIO + metadata */
@Module({
  imports: [AuthModule, PrismaModule, SearchModule, GamificationModule, PrivacyModule, CollaborationModule, forwardRef(() => DocumentOcrModule)],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
