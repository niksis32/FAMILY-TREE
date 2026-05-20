import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/** Full-text search via Meilisearch — index sync from Prisma hooks/queue */
@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
