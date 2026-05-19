import { Injectable } from '@nestjs/common';

@Injectable()
export class PersonsService {
  // Iteration 2: inject PrismaService for CRUD
  skeleton(action: string) {
    return { module: 'persons', action, status: 'skeleton' };
  }
}
