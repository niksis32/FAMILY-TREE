import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityReputationService } from './community-reputation.service';

@Module({
  imports: [PrismaModule],
  providers: [CommunityReputationService],
  exports: [CommunityReputationService],
})
export class CommunityReputationModule {}
