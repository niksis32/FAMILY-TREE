import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SourcesModule } from '../sources/sources.module';
import { CommercialModule } from '../commercial/commercial.module';
import { ArchiveComplianceService } from './archive-compliance.service';
import { ArchiveSearchProcessor } from './archive-search.processor';
import { ArchiveSearchQueueService } from './archive-search.queue';
import { ExternalArchivesController } from './external-archives.controller';
import { ExternalArchivesService } from './external-archives.service';
import { ImportAsSourceService } from './import-as-source.service';
import { FamilySearchProvider } from './providers/familysearch.provider';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule, SourcesModule, CommercialModule],
  controllers: [ExternalArchivesController],
  providers: [
    ExternalArchivesService,
    ImportAsSourceService,
    ArchiveComplianceService,
    ArchiveSearchQueueService,
    ArchiveSearchProcessor,
    FamilySearchProvider,
  ],
  exports: [ExternalArchivesService],
})
export class ExternalArchivesModule {}
