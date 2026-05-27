import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityResearchController } from './community-research.controller';
import { CommunityResearchService } from './community-research.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommunityResearchController],
  providers: [CommunityResearchService],
  exports: [CommunityResearchService],
})
export class CommunityResearchModule {}
