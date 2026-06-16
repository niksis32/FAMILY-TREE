import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { TreeModule } from '../tree/tree.module';
import { ExportTemplateService } from './export-template.service';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportProcessor } from './pdf-export.processor';
import { PdfExportQueueService } from './pdf-export.queue';
import { PdfExportService } from './pdf-export.service';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, MinioStorageModule, CommercialModule, TreeModule],
  controllers: [PdfExportController],
  providers: [
    PdfExportService,
    ExportTemplateService,
    PdfExportQueueService,
    PdfExportProcessor,
  ],
  exports: [PdfExportService],
})
export class PdfExportModule {}
