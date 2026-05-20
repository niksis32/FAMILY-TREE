import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TreeController } from './tree.controller';
import { TreeService } from './tree.service';

@Module({
  imports: [PrismaModule],
  controllers: [TreeController],
  providers: [TreeService],
})
export class TreeModule {}
