import { Injectable } from '@nestjs/common';

@Injectable()
export class CitationsService {
  skeleton(action: string) {
    return { module: 'citations', action, status: 'skeleton' };
  }
}
