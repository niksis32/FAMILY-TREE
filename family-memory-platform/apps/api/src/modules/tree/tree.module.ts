import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { TreeController } from './tree.controller';
import { TreeService } from './tree.service';
import { TreeViewDataService } from './tree-view-data.service';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [TreeController],
  providers: [TreeService, TreeViewDataService],
  exports: [TreeService, TreeViewDataService],
})
export class TreeModule {}
