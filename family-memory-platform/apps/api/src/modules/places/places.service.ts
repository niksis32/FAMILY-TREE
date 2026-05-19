import { Injectable } from '@nestjs/common';

@Injectable()
export class PlacesService {
  skeleton(action: string) {
    return { module: 'places', action, status: 'skeleton' };
  }
}
