import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MatchingController } from './matching.controller';
import { MatchingIndexService } from './matching-index.service';
import { MatchingProcessor } from './matching.processor';
import { MatchingQueueService } from './matching.queue';
import { MatchingService } from './matching.service';
import { PersonMatchLoader } from './person-match.loader';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, WorkspacesModule],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    MatchingIndexService,
    MatchingQueueService,
    MatchingProcessor,
    PersonMatchLoader,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
