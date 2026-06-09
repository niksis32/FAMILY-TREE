import { Module } from '@nestjs/common';
import { OpsErrorLogService } from '../../common/filters/ops-error-log.service';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminOpsService } from './admin-ops.service';
import { AdminService } from './admin.service';

/** Admin: users, audit logs, reindex search, system health */
@Module({
  imports: [AuthModule, PrismaModule, RedisModule, MinioStorageModule],
  controllers: [AdminController],
  providers: [AdminService, AdminOpsService, OpsErrorLogService],
  exports: [OpsErrorLogService, AdminOpsService],
})
export class AdminModule {}
