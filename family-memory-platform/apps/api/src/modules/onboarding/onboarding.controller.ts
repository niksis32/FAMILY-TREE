import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateOnboardingProgressDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('progress')
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getProgress(user.id);
  }

  @Patch('progress')
  updateProgress(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOnboardingProgressDto) {
    return this.service.updateProgress(user.id, dto);
  }
}
