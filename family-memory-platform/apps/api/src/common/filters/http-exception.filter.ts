import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { getRequestId } from '../logging/request-context';
import { StructuredLogger } from '../logging/structured-logger';
import { OpsErrorLogService } from './ops-error-log.service';

export type ApiErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  requestId?: string;
};

const STATUS_LABELS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger(HttpExceptionFilter.name);
  private opsErrorLog: OpsErrorLogService | null = null;

  setOpsErrorLogService(service: OpsErrorLogService) {
    this.opsErrorLog = service;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id?: string } }>();
    const response = ctx.getResponse<Response>();

    const payload = this.toErrorResponse(exception, request);
    response.status(payload.statusCode).json(payload);

    if (payload.statusCode >= 500 && this.opsErrorLog) {
      void this.opsErrorLog.logServerError({
        statusCode: payload.statusCode,
        message: Array.isArray(payload.message) ? payload.message.join('; ') : payload.message,
        stack: exception instanceof Error ? exception.stack : undefined,
        method: request.method,
        path: request.originalUrl?.split('?')[0],
        userId: request.user?.id,
      });
    }
  }

  private toErrorResponse(exception: unknown, request?: Request): ApiErrorResponse {
    const timestamp = new Date().toISOString();
    const requestId = getRequestId();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return {
          statusCode,
          message: body,
          error: this.errorLabel(statusCode),
          timestamp,
          requestId,
        };
      }

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        const message = record.message;
        return {
          statusCode,
          message: Array.isArray(message)
            ? message.map(String)
            : typeof message === 'string'
              ? message
              : exception.message,
          error:
            typeof record.error === 'string' ? record.error : this.errorLabel(statusCode),
          timestamp,
          requestId,
        };
      }
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, { stack: exception.stack, path: request?.originalUrl });
    } else {
      this.logger.error('Unhandled exception', { detail: String(exception), path: request?.originalUrl });
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: this.errorLabel(HttpStatus.INTERNAL_SERVER_ERROR),
      timestamp,
      requestId,
    };
  }

  private errorLabel(statusCode: number): string {
    return STATUS_LABELS[statusCode as HttpStatus] ?? 'Error';
  }
}
