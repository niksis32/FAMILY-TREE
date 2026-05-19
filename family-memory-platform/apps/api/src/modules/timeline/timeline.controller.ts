import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';

@ApiTags('timeline')
@Controller('timeline')
export class TimelineController {
  constructor(private readonly service: TimelineService) {}

  @Get('person/:personId')
  byPerson(@Param('personId') personId: string) {
    return this.service.skeleton('byPerson', { personId });
  }
}
