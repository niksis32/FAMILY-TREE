import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { NotificationSource } from '@family/shared';

const SOURCES = ['MESSENGER', 'MATCH', 'MODERATION', 'INVITE', 'CALENDAR', 'ACTIVITY', 'SYSTEM'] as const;

export class UpdateNotificationPreferenceDto {
  @IsIn(SOURCES)
  source!: NotificationSource;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
