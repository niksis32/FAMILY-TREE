import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityGroupsController } from './community-groups.controller';
import { CommunityGroupsService } from './community-groups.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommunityGroupsController],
  providers: [CommunityGroupsService],
  exports: [CommunityGroupsService],
})
export class CommunityGroupsModule {}
