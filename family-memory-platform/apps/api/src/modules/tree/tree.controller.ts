import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TreeViewDataQueryDto } from './tree-view-data.dto';
import { TreeService } from './tree.service';

@ApiTags('tree')
@Controller('tree')
export class TreeController {
  constructor(private readonly service: TreeService) {}

  @Get('person/:id/view-data')
  viewData(@Param('id') id: string, @Query() query: TreeViewDataQueryDto) {
    return this.service.getViewData(id, query);
  }

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
