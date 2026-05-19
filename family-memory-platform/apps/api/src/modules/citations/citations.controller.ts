import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CitationsService } from './citations.service';

@ApiTags('citations')
@Controller('citations')
export class CitationsController {
  constructor(private readonly service: CitationsService) {}

  @Get()
  findAll() {
    return this.service.skeleton('findAll');
  }
}
