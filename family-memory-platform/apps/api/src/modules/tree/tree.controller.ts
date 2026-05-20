import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TreeService } from './tree.service';

@ApiTags('tree')
@Controller('tree')
export class TreeController {
  constructor(private readonly service: TreeService) {}

  @Get('person/:id/ancestors')
  ancestors(@Param('id') id: string) {
    return this.service.getAncestors(id);
  }

  @Get('person/:id/descendants')
  descendants(@Param('id') id: string) {
    return this.service.getDescendants(id);
  }

  @Get('person/:id/full')
  full(@Param('id') id: string) {
    return this.service.getFullGraph(id);
  }
}
