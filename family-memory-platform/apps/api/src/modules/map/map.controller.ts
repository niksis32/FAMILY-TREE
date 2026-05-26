import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MapQueryDto, MigrationPathQueryDto } from './map.dto';
import { MapService } from './map.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private readonly service: MapService) {}

  @Get('person/:personId')
  personMap(@Param('personId') personId: string, @Query() query: MapQueryDto) {
    return this.service.getPersonMap(personId, query);
  }

  @Get('family/:familyId')
  familyMap(@Param('familyId') familyId: string, @Query() query: MapQueryDto) {
    return this.service.getFamilyMap(familyId, query);
  }

  @Get('tree/:treeId')
  treeMap(@Param('treeId') treeId: string, @Query() query: MapQueryDto) {
    return this.service.getTreeMap(treeId, query);
  }

  @Get('migration-path')
  migrationPath(@Query() query: MigrationPathQueryDto) {
    return this.service.getMigrationPath({
      personIds: query.personIds,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      eventTypes: query.eventTypes,
      includeHistoricalNames: query.includeHistoricalNames,
    });
  }
}
