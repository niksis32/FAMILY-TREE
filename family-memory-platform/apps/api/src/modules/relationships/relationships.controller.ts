import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';

@ApiTags('relationships')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly service: RelationshipsService) {}

  @Get()
  findAll() {
    return this.service.skeleton('findAll');
  }
}
