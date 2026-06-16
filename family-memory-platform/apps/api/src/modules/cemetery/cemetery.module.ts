import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { BurialIndexService } from './burial-index.service';
import { BurialPhotogrammetryProcessor } from './burial-photogrammetry.processor';
import { BurialPhotogrammetryQueueService } from './burial-photogrammetry.queue';
import { CemeteryController } from './cemetery.controller';
import { CemeteryService } from './cemetery.service';

@Module({
  imports: [PrismaModule, AuthModule, CommercialModule, RedisModule],
  controllers: [CemeteryController],
  providers: [
    CemeteryService,
    BurialIndexService,
    BurialPhotogrammetryQueueService,
    BurialPhotogrammetryProcessor,
  ],
  exports: [CemeteryService, BurialIndexService],
})
export class CemeteryModule {}
