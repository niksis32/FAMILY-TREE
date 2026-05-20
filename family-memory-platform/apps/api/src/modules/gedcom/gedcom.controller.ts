import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GedcomImportDto, GedcomTextDto } from './gedcom.dto';
import { GedcomService } from './gedcom.service';

@ApiTags('gedcom')
@Controller('gedcom')
export class GedcomController {
  constructor(private readonly service: GedcomService) {}

  @Post('preview')
  preview(@Body() dto: GedcomTextDto) {
    return this.service.preview(dto);
  }

  @Post('import')
  import(@Body() dto: GedcomImportDto) {
    return this.service.import(dto);
  }
}
