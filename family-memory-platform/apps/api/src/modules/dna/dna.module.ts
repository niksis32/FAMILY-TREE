import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { DnaConsentService } from './dna-consent.service';
import { DnaController } from './dna.controller';
import { DnaImportProcessor } from './dna-import.processor';
import { DnaImportQueueService } from './dna-import.queue';
import { DnaService } from './dna.service';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, MinioStorageModule, CommercialModule],
  controllers: [DnaController],
  providers: [DnaService, DnaConsentService, DnaImportQueueService, DnaImportProcessor],
  exports: [DnaService],
})
export class DnaModule {}
