import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityReputationModule } from '../community-reputation/community-reputation.module';
import { CommunityGraphqlController } from './community-graphql.controller';
import { CommunityGraphqlService } from './community-graphql.service';

@Module({
  imports: [PrismaModule, CommunityReputationModule],
  controllers: [CommunityGraphqlController],
  providers: [CommunityGraphqlService],
})
export class CommunityGraphqlModule {}
