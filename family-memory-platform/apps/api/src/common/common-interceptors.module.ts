import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { WorkspaceContextInterceptor } from './interceptors/workspace-context.interceptor';
import { WorkspacesModule } from '../modules/workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  providers: [
    WorkspaceContextInterceptor,
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkspaceContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class CommonInterceptorsModule {}
