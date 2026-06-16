import { Module, forwardRef } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MatchingController } from './matching.controller';
import { MatchingIndexService } from './matching-index.service';
import { MatchingProcessor } from './matching.processor';
import { MatchingQueueService } from './matching.queue';
import { MatchingScoringService } from './matching-scoring.service';
import { MatchingService } from './matching.service';
import { PersonMatchLoader } from './person-match.loader';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RedisModule,
    WorkspacesModule,
    AiModule,
    PrivacyModule,
    CollaborationModule,
    forwardRef(() => WebhooksModule),
  ],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    MatchingScoringService,
    MatchingIndexService,
    MatchingQueueService,
    MatchingProcessor,
    PersonMatchLoader,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
