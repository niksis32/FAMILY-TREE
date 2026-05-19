import { Module } from '@nestjs/common';
import { GedcomController } from './gedcom.controller';
import { GedcomService } from './gedcom.service';

/** GEDCOM import/export — uses @family/genealogy-core gedcom-mapper */
@Module({
  controllers: [GedcomController],
  providers: [GedcomService],
})
export class GedcomModule {}
