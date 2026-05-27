import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { CitationsModule } from '../citations/citations.module';
import { DocumentsModule } from '../documents/documents.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { DocumentIntelligenceController } from './document-intelligence.controller';
import { DocumentIntelligenceService } from './document-intelligence.service';

/** AI Document Intelligence — OCR/NER suggestions; confirms delegate to domain modules. */
@Module({
  imports: [AuthModule, AiModule, DocumentsModule, EventsModule, RelationshipsModule, CitationsModule, GamificationModule],
  controllers: [DocumentIntelligenceController],
  providers: [DocumentIntelligenceService],
})
export class DocumentIntelligenceModule {}
