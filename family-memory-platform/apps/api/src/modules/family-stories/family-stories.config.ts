import type { ConfigService } from '@nestjs/config';

export function isFamilyStoryModerationEnabled(config: ConfigService): boolean {
  return config.get<string>('FAMILY_STORY_MODERATION_ENABLED') === 'true';
}
