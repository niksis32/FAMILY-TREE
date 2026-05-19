import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  skeleton(action: string) {
    return { module: 'media', action, status: 'skeleton', storage: 'minio' };
  }
}
