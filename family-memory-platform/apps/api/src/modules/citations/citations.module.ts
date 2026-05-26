import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';

/** Citations linking persons/facts to sources */
@Module({
  imports: [AuthModule, PrismaModule, GamificationModule],
  controllers: [CitationsController],
  providers: [CitationsService],
})
export class CitationsModule {}
