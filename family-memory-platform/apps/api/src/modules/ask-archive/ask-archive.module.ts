import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { AskArchiveController } from './ask-archive.controller';
import { AskArchiveService } from './ask-archive.service';

@Module({
  imports: [PrismaModule, AuthModule, SearchModule],
  controllers: [AskArchiveController],
  providers: [AskArchiveService],
  exports: [AskArchiveService],
})
export class AskArchiveModule {}
