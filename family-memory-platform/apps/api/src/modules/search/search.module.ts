import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/** Full-text search via Meilisearch — index sync from Prisma hooks/queue */
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
