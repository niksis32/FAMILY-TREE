import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from '../logging/request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    requestContext.run(
      {
        requestId,
        method: req.method,
        path: req.originalUrl?.split('?')[0],
      },
      () => next(),
    );
  }
}
