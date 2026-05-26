import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TreeModule } from '../tree/tree.module';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [PrismaModule, TreeModule],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
