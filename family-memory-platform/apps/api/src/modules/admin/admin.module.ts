import { Module } from '@nestjs/common';
import { OpsErrorLogService } from '../../common/filters/ops-error-log.service';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MilitaryHistoryModule } from '../military-history/military-history.module';
import { AdminController } from './admin.controller';
import { AdminMessagesService } from './admin-messages.service';
import { AdminOpsService } from './admin-ops.service';
import { AdminSessionsService } from './admin-sessions.service';
import { AdminSiteService } from './admin-site.service';
import { AdminService } from './admin.service';
import { PortalPublicController } from './portal-public.controller';

/** Admin: users, audit logs, reindex search, system health */
@Module({
  imports: [AuthModule, PrismaModule, RedisModule, MinioStorageModule, MilitaryHistoryModule],
  controllers: [AdminController, PortalPublicController],
  providers: [AdminService, AdminSessionsService, AdminMessagesService, AdminSiteService, AdminOpsService, OpsErrorLogService],
  exports: [OpsErrorLogService, AdminOpsService],
})
export class AdminModule {}
