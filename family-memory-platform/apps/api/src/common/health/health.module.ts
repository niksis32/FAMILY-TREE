import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioStorageModule } from '../storage/minio-storage.module';
import { HealthController } from './health.controller';

/** Liveness/readiness for Docker and VPS monitoring */
@Module({
  imports: [PrismaModule, MinioStorageModule],
  controllers: [HealthController],
})
export class HealthModule {}
