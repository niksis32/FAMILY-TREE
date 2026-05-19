import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Get()
  findAll() {
    return this.service.skeleton('findAll');
  }
}
