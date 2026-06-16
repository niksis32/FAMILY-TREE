import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SocialArchiveImportController } from './social-archive-import.controller';
import { SocialArchiveImportService } from './social-archive-import.service';

@Module({
  imports: [PrismaModule, RedisModule, MinioStorageModule, AuthModule],
  controllers: [SocialArchiveImportController],
  providers: [SocialArchiveImportService],
  exports: [SocialArchiveImportService],
})
export class SocialArchiveImportModule {}
