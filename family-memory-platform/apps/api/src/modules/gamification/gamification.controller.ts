import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

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
}
