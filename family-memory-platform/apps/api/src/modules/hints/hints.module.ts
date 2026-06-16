import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { HintsController } from './hints.controller';
import { HintsService } from './hints.service';

@Module({
  imports: [PrismaModule, AuthModule, GamificationModule],
  controllers: [HintsController],
  providers: [HintsService],
  exports: [HintsService],
})
export class HintsModule {}
