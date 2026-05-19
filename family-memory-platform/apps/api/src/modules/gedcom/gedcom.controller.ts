import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GedcomService } from './gedcom.service';

@ApiTags('gedcom')
@Controller('gedcom')
export class GedcomController {
  constructor(private readonly service: GedcomService) {}

  @Post('import')
  import() {
    return this.service.skeleton('import');
  }
}
