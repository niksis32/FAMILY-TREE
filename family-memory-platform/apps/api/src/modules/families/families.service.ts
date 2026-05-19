import { Injectable } from '@nestjs/common';

@Injectable()
export class FamiliesService {
  skeleton(action: string) {
    return { module: 'families', action, status: 'skeleton' };
  }
}
