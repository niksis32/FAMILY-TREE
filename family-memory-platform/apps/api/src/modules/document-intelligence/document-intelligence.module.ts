import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { CitationsModule } from '../citations/citations.module';
import { DocumentsModule } from '../documents/documents.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { DocumentIntelligenceController } from './document-intelligence.controller';
import { DocumentIntelligenceOcrRunnerService } from './document-intelligence-ocr-runner.service';
import { DocumentIntelligenceStoreService } from './document-intelligence-store.service';
import { DocumentIntelligenceService } from './document-intelligence.service';

/** AI Document Intelligence — OCR/NER suggestions; confirms delegate to domain modules. */
@Module({
  imports: [AuthModule, AiModule, DocumentsModule, EventsModule, RelationshipsModule, CitationsModule, GamificationModule],
  controllers: [DocumentIntelligenceController],
  providers: [DocumentIntelligenceStoreService, DocumentIntelligenceOcrRunnerService, DocumentIntelligenceService],
  exports: [DocumentIntelligenceStoreService, DocumentIntelligenceOcrRunnerService, DocumentIntelligenceService],
})
export class DocumentIntelligenceModule {}
