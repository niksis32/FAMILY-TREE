import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FaceClusteringController } from './face-clustering.controller';
import { FaceClusteringService } from './face-clustering.service';
import { FaceClusterRebuildProcessor } from './face-cluster-rebuild.processor';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [FaceClusteringController],
  providers: [FaceClusteringService, FaceClusterRebuildProcessor],
  exports: [FaceClusteringService],
})
export class FaceClusteringModule {}
