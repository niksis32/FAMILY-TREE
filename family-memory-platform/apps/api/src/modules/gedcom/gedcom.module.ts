import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GedcomController } from './gedcom.controller';
import { GedcomService } from './gedcom.service';

/** GEDCOM import/export — uses @family/genealogy-core gedcom-mapper */
@Module({
  imports: [PrismaModule],
  controllers: [GedcomController],
  providers: [GedcomService],
})
export class GedcomModule {}
