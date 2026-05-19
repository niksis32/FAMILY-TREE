import { Injectable } from '@nestjs/common';

@Injectable()
export class TimelineService {
  skeleton(action: string, meta?: Record<string, string>) {
    return { module: 'timeline', action, status: 'skeleton', ...meta };
  }
}
