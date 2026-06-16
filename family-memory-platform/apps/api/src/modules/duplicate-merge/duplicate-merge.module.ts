import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module';
import { SearchModule } from '../search/search.module';
import { DuplicateMergeController } from './duplicate-merge.controller';
import { DuplicateMergeService } from './duplicate-merge.service';

@Module({
  imports: [PrismaModule, AuthModule, ActivityFeedModule, SearchModule],
  controllers: [DuplicateMergeController],
  providers: [DuplicateMergeService],
  exports: [DuplicateMergeService],
})
export class DuplicateMergeModule {}
