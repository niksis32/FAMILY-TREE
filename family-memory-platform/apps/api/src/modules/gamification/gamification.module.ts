import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AchievementService } from './achievement.service';
import { GamificationActivityService } from './gamification-activity.service';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { QuestEngineService } from './quest-engine.service';
import { QuestLeaderboardService } from './quest-leaderboard.service';

/** Family Quest — premium research gamification */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GamificationController],
  providers: [
    GamificationService,
    ProgressCalculatorService,
    QuestEngineService,
    QuestLeaderboardService,
    AchievementService,
    GamificationActivityService,
  ],
  exports: [GamificationActivityService, GamificationService, ProgressCalculatorService, QuestLeaderboardService],
})
export class GamificationModule {}
