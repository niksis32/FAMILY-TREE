import { Module, forwardRef } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { MapModule } from '../map/map.module';
import { MediaModule } from '../media/media.module';
import { TimelineModule } from '../timeline/timeline.module';
import { FamilyStoriesController } from './family-stories.controller';
import { FamilyStoriesModerationController } from './family-stories-moderation.controller';
import { FamilyStoriesPublicController } from './family-stories-public.controller';
import { FamilyStoriesPdfService } from './family-stories-pdf.service';
import { FamilyStoriesPrivacyService } from './family-stories-privacy.service';
import { FamilyStoriesService } from './family-stories.service';

@Module({
  imports: [
    AuthModule,
    AiModule,
    TimelineModule,
    MapModule,
    MediaModule,
    DocumentsModule,
    forwardRef(() => WebhooksModule),
  ],
  controllers: [
    FamilyStoriesController,
    FamilyStoriesModerationController,
    FamilyStoriesPublicController,
  ],
  providers: [FamilyStoriesService, FamilyStoriesPrivacyService, FamilyStoriesPdfService],
  exports: [FamilyStoriesService],
})
export class FamilyStoriesModule {}
