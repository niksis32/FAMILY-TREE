import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

/** Genealogical sources (books, archives, URLs) */
@Module({
  imports: [AuthModule, PrismaModule, SearchModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
