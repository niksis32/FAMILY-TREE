import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { StoryTranslationModule } from '../story-translation/story-translation.module';
import { PushStubController } from './push-stub.controller';

/** BLOCK 4 — Experience & Retention umbrella module */
@Module({
  imports: [OnboardingModule, StoryTranslationModule, GamificationModule, AuthModule],
  controllers: [PushStubController],
  exports: [OnboardingModule, StoryTranslationModule, GamificationModule],
})
export class ExperienceBlockModule {}
