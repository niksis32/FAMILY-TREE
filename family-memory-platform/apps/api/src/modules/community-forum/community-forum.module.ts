import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityGroupsModule } from '../community-groups/community-groups.module';
import { CommunityReputationModule } from '../community-reputation/community-reputation.module';
import { CommunityForumController } from './community-forum.controller';
import { CommunityForumService } from './community-forum.service';
import { CommunitySpamGuardService } from './community-spam-guard.service';

@Module({
  imports: [PrismaModule, AuthModule, CommunityGroupsModule, CommunityReputationModule],
  controllers: [CommunityForumController],
  providers: [CommunityForumService, CommunitySpamGuardService],
  exports: [CommunityForumService],
})
export class CommunityForumModule {}
