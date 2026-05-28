import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { FamiliesModule } from '../families/families.module';
import { MapModule } from '../map/map.module';
import { PersonsModule } from '../persons/persons.module';
import { TimelineModule } from '../timeline/timeline.module';
import { StorytellingController } from './storytelling.controller';
import { StorytellingService } from './storytelling.service';

@Module({
  imports: [AuthModule, AiModule, PersonsModule, FamiliesModule, MapModule, TimelineModule, DocumentsModule],
  controllers: [StorytellingController],
  providers: [StorytellingService],
  exports: [StorytellingService],
})
export class StorytellingModule {}

