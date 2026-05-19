import { Injectable } from '@nestjs/common';
import { mapGedcomToDomain } from '@family/genealogy-core';

@Injectable()
export class GedcomService {
  skeleton(action: string) {
    return { module: 'gedcom', action, status: 'skeleton', preview: mapGedcomToDomain('') };
  }
}
