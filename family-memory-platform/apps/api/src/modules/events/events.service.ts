import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  skeleton(action: string) {
    return { module: 'events', action, status: 'skeleton' };
  }
}
