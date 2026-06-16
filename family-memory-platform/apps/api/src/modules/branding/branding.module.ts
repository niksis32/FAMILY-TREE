import { Module } from '@nestjs/common';
import { MinioStorageModule } from '../../common/storage/minio-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { BrandingSslService } from './branding-ssl.service';

@Module({
  imports: [PrismaModule, AuthModule, CommercialModule, MinioStorageModule],
  controllers: [BrandingController],
  providers: [BrandingService, BrandingSslService],
  exports: [BrandingService],
})
export class BrandingModule {}
