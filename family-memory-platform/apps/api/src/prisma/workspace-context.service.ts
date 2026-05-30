import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export type WorkspaceContextSnapshot = {
  workspaceId?: string;
  /** When true, Prisma workspace isolation extension does not inject filters. */
  bypass?: boolean;
};

@Injectable()
export class WorkspaceContextService {
  private readonly storage = new AsyncLocalStorage<WorkspaceContextSnapshot>();

  getSnapshot(): WorkspaceContextSnapshot {
    return this.storage.getStore() ?? {};
  }

  run<T>(snapshot: WorkspaceContextSnapshot, fn: () => T): T {
    const current = this.getSnapshot();
    return this.storage.run({ ...current, ...snapshot }, fn);
  }

  runBypass<T>(fn: () => T): T {
    return this.run({ bypass: true }, fn);
  }
}
