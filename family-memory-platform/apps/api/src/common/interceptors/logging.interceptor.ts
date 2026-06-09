import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { StructuredLogger } from '../logging/structured-logger';
import { requestContext } from '../logging/request-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      user?: { id?: string };
    }>();
    const started = Date.now();
    const store = requestContext.getStore();
    if (store && req.user?.id) {
      store.userId = req.user.id;
    }

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info('request.completed', {
            method: req.method,
            path: req.originalUrl?.split('?')[0],
            durationMs: Date.now() - started,
            userId: req.user?.id,
          });
        },
        error: (error: unknown) => {
          this.logger.error('request.failed', {
            method: req.method,
            path: req.originalUrl?.split('?')[0],
            durationMs: Date.now() - started,
            userId: req.user?.id,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }
}
