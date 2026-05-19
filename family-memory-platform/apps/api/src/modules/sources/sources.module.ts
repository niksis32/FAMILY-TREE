import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

/** Genealogical sources (books, archives, URLs) */
@Module({
  controllers: [SourcesController],
  providers: [SourcesService],
})
export class SourcesModule {}
