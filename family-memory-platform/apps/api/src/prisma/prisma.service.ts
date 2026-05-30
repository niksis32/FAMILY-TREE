import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WorkspaceContextService } from './workspace-context.service';
import { workspaceIsolationExtension } from './workspace-isolation.extension';

export type ExtendedPrismaClient = ReturnType<PrismaService['createExtendedClient']>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly workspaceContext: WorkspaceContextService) {
    super();
  }

  private createExtendedClient() {
    return this.$extends(
      workspaceIsolationExtension(() => this.workspaceContext.getSnapshot()),
    );
  }

  async onModuleInit() {
    await this.$connect();
    const extended = this.createExtendedClient();
    Object.assign(this, extended);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
