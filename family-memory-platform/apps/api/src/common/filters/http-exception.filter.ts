import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

export type ApiErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
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
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const payload = this.toErrorResponse(exception);
    response.status(payload.statusCode).json(payload);
  }

  private toErrorResponse(exception: unknown): ApiErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return {
          statusCode,
          message: body,
          error: this.errorLabel(statusCode),
          timestamp,
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
        };
      }
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unhandled exception', String(exception));
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: this.errorLabel(HttpStatus.INTERNAL_SERVER_ERROR),
      timestamp,
    };
  }

  private errorLabel(statusCode: number): string {
    return STATUS_LABELS[statusCode as HttpStatus] ?? 'Error';
  }
}
