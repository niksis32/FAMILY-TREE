import { Injectable } from '@nestjs/common';

@Injectable()
export class RelationshipsService {
  skeleton(action: string) {
    return { module: 'relationships', action, status: 'skeleton' };
  }
}
