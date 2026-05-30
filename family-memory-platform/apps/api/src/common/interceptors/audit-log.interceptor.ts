import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../../modules/auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../prisma/workspace-context.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SKIP_PATH_PREFIXES = [
  '/api/v1/health',
  '/api/v1/auth/login',
  '/api/v1/auth/register-first-admin',
];

type RequestWithUser = {
  method: string;
  originalUrl: string;
  url: string;
  route?: { path?: string };
  params: Record<string, string>;
  body?: Record<string, unknown>;
  user?: AuthenticatedUser;
  ip?: string;
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method.toUpperCase();

    if (!MUTATION_METHODS.has(method) || this.shouldSkip(request)) {
      return next.handle();
    }

    const routePath = request.route?.path ?? request.url.split('?')[0];
    const entityType = this.resolveEntityType(routePath);
    const entityId = this.resolveEntityId(request.params, request.body);
    const action = `${method.toLowerCase()}.${entityType}`;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.writeAuditLog(request, action, entityType, entityId);
        },
      }),
    );
  }

  private shouldSkip(request: RequestWithUser) {
    const path = request.originalUrl.split('?')[0];
    return SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  }

  private resolveEntityType(routePath: string) {
    const segments = routePath.split('/').filter(Boolean);
    const apiIndex = segments.indexOf('v1');
    const resource = apiIndex >= 0 ? segments[apiIndex + 1] : segments[0];
    return resource ?? 'unknown';
  }

  private resolveEntityId(params: Record<string, string>, body?: Record<string, unknown>) {
    const paramId =
      params.id ??
      params.personId ??
      params.mediaId ??
      params.documentId ??
      params.familyId ??
      params.workspaceId;

    if (paramId) return paramId;

    const bodyId = body?.id;
    return typeof bodyId === 'string' ? bodyId : undefined;
  }

  private async writeAuditLog(
    request: RequestWithUser,
    action: string,
    entityType: string,
    entityId?: string,
  ) {
    const snapshot = this.workspaceContext.getSnapshot();

    try {
      await this.workspaceContext.runBypass(() =>
        this.prisma.auditLog.create({
          data: {
            userId: request.user?.id,
            workspaceId: snapshot.workspaceId,
            action,
            entityType,
            entityId,
            payload: {
              method: request.method,
              path: request.originalUrl,
            },
          },
        }),
      );
    } catch {
      // Audit must not break mutation responses.
    }
  }
}
