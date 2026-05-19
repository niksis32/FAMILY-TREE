import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  skeleton(action: string, meta?: Record<string, string>) {
    return { module: 'search', action, status: 'skeleton', engine: 'meilisearch', ...meta };
  }
}
