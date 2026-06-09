import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { WorkspaceExportController } from './workspace-export.controller';
import { WorkspaceExportProcessor } from './workspace-export.processor';
import { WorkspaceExportQueueService } from './workspace-export.queue';
import { WorkspaceExportService } from './workspace-export.service';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, MinioStorageModule, CommercialModule, PrivacyModule],
  controllers: [WorkspaceExportController],
  providers: [WorkspaceExportService, WorkspaceExportQueueService, WorkspaceExportProcessor],
  exports: [WorkspaceExportService],
})
export class WorkspaceExportModule {}
