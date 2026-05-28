import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { TreeViewDataQueryDto } from './tree-view-data.dto';
import { TreeService } from './tree.service';

@ApiTags('tree')
@Controller('tree')
export class TreeController {
  constructor(private readonly service: TreeService) {}

  @Get('person/:id/view-data')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  viewData(
    @Param('id') id: string,
    @Query() query: TreeViewDataQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.getViewData(id, query, user);
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
