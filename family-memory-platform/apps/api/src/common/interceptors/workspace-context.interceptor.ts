import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../modules/auth/current-user.decorator';
import { WorkspacesService } from '../../modules/workspaces/workspaces.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const headerValue = request.headers['x-workspace-id'];
    let workspaceId = typeof headerValue === 'string' ? headerValue.trim() : undefined;

    if (!workspaceId && request.user?.id) {
      const workspace = await this.workspaces.ensureDefaultWorkspace(request.user.id);
      workspaceId = workspace.id;
    }

    if (workspaceId && request.user?.id) {
      await this.workspaces.assertMember(workspaceId, request.user.id);
    }

    return new Observable((subscriber) => {
      this.workspaceContext.run({ workspaceId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
