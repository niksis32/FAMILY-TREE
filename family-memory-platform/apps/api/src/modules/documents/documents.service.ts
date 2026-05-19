import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentsService {
  skeleton(action: string) {
    return { module: 'documents', action, status: 'skeleton' };
  }
}
