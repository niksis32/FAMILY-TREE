import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { MediaModule } from '../media/media.module';
import { PersonPhotoLinksController } from './person-photo-links.controller';
import { PersonPhotoLinksService } from './person-photo-links.service';

@Module({
  imports: [PrismaModule, MediaModule, AiModule, AuthModule, GamificationModule],
  controllers: [PersonPhotoLinksController],
  providers: [PersonPhotoLinksService],
  exports: [PersonPhotoLinksService],
})
export class PersonPhotoLinksModule {}
