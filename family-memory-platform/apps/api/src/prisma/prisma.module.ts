import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WorkspaceContextService } from './workspace-context.service';

/** Global Prisma client — inject PrismaService into feature modules */
@Global()
@Module({
  providers: [WorkspaceContextService, PrismaService],
  exports: [WorkspaceContextService, PrismaService],
})
export class PrismaModule {}
