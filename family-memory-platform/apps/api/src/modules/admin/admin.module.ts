import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/** Admin: users, audit logs, reindex search, system health */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
