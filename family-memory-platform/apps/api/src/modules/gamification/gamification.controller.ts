import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamificationService } from './gamification.service';
import { QuestLeaderboardService } from './quest-leaderboard.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly service: GamificationService,
    private readonly leaderboardService: QuestLeaderboardService,
  ) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDashboard(user.id);
  }

  @Get('progress')
  progress() {
    return this.service.getProgress();
  }

  @Get('score')
  score() {
    return this.service.getScore();
  }

  @Get('quests')
  @UseGuards(JwtAuthGuard)
  quests(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getQuests(user.id);
  }

  @Get('achievements')
  @UseGuards(JwtAuthGuard)
  achievements(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getAchievements(user.id);
  }

  @Get('gaps')
  gaps() {
    return this.service.getGaps();
  }

  @Get('mysteries')
  mysteries() {
    return this.service.getMysteries();
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  leaderboard(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getLeaderboard(user.id);
  }

  @Get('leaderboard/opt-in')
  @UseGuards(JwtAuthGuard)
  optInStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getOptIn(user.id);
  }

  @Patch('leaderboard/opt-in')
  @UseGuards(JwtAuthGuard)
  setOptIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { optedIn: boolean; displayName?: string | null },
  ) {
    return this.leaderboardService.setOptIn(user.id, body.optedIn, body.displayName);
  }
}
