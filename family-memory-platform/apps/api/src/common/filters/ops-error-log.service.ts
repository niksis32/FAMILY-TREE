import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestId } from '../logging/request-context';
import { StructuredLogger } from '../logging/structured-logger';

@Injectable()
export class OpsErrorLogService {
  private readonly logger = new StructuredLogger('ops-error');

  constructor(private readonly prisma: PrismaService) {}

  async logServerError(params: {
    statusCode: number;
    message: string;
    stack?: string;
    method?: string;
    path?: string;
    userId?: string;
  }) {
    const requestId = getRequestId();
    this.logger.error(params.message, {
      requestId,
      statusCode: params.statusCode,
      method: params.method,
      path: params.path,
    });

    try {
      await this.prisma.opsErrorLog.create({
        data: {
          requestId,
          statusCode: params.statusCode,
          message: params.message.slice(0, 4000),
          stack: params.stack?.slice(0, 8000),
          method: params.method,
          path: params.path,
          userId: params.userId,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist ops error log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listRecent(limit = 50) {
    return this.prisma.opsErrorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
