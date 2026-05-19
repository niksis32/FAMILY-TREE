import { Injectable } from '@nestjs/common';

@Injectable()
export class SourcesService {
  skeleton(action: string) {
    return { module: 'sources', action, status: 'skeleton' };
  }
}
