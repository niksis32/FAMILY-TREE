import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { SearchModule } from '../search/search.module';
import { MediaModule } from '../media/media.module';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

/** CRUD for Person entities — core of family tree */
@Module({
  imports: [
    AuthModule,
    PrismaModule,
    SearchModule,
    MediaModule,
    GamificationModule,
    PrivacyModule,
    ActivityFeedModule,
    CollaborationModule,
    forwardRef(() => WebhooksModule),
  ],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
