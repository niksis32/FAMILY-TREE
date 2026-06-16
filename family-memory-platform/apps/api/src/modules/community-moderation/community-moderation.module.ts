import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { CommunityReputationModule } from '../community-reputation/community-reputation.module';
import { CommunityModerationController } from './community-moderation.controller';
import { CommunityModerationService } from './community-moderation.service';

@Module({
  imports: [PrismaModule, AuthModule, CommunityReputationModule, CollaborationModule],
  controllers: [CommunityModerationController],
  providers: [CommunityModerationService],
  exports: [CommunityModerationService],
})
export class CommunityModerationModule {}
