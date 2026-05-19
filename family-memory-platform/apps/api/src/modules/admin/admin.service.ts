import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  skeleton(action: string) {
    return { module: 'admin', action, status: 'skeleton' };
  }
}
