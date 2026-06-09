import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MinioStorageModule } from '../storage/minio-storage.module';
import { DeepHealthService } from './deep-health.service';
import { HealthController } from './health.controller';

/** Liveness/readiness for Docker and VPS monitoring */
@Module({
  imports: [PrismaModule, MinioStorageModule, RedisModule],
  controllers: [HealthController],
  providers: [DeepHealthService],
  exports: [DeepHealthService],
})
export class HealthModule {}
