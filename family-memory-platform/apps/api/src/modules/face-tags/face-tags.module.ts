import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { FaceTagsController } from './face-tags.controller';
import { FaceTagsService } from './face-tags.service';

@Module({
  imports: [PrismaModule, AuthModule, GamificationModule],
  controllers: [FaceTagsController],
  providers: [FaceTagsService],
  exports: [FaceTagsService],
})
export class FaceTagsModule {}
