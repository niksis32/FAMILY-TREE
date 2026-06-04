import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { SearchController } from './search.controller';
import { SearchPrivacyService } from './search-privacy.service';
import { SearchService } from './search.service';

/** Full-text search via Meilisearch — index sync from Prisma hooks/queue */
@Module({
  imports: [PrismaModule, AuthModule, PrivacyModule],
  controllers: [SearchController],
  providers: [SearchService, SearchPrivacyService],
  exports: [SearchService],
})
export class SearchModule {}
