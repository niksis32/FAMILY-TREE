import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StoriesLocalesController } from './stories-locales.controller';
import { StoryTranslationService } from './story-translation.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [StoriesLocalesController],
  providers: [StoryTranslationService],
  exports: [StoryTranslationService],
})
export class StoryTranslationModule {}
