import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { MemoryStoriesController } from './memory-stories.controller';
import { MemoryStoriesService } from './memory-stories.service';
import { MediaTranscriptProcessor } from './media-transcript.processor';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, forwardRef(() => SearchModule)],
  controllers: [MemoryStoriesController],
  providers: [MemoryStoriesService, MediaTranscriptProcessor],
  exports: [MemoryStoriesService],
})
export class MemoryStoriesModule {}
