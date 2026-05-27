import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ModerationReportCategory, ModerationReportStatus } from '@prisma/client';

export class CreateModerationReportDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  targetType!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  targetId!: string;

  @IsEnum(ModerationReportCategory)
  category!: ModerationReportCategory;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}

export class ModerationResolveDto {
  @IsEnum(ModerationReportStatus)
  status!: ModerationReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  moderatorNote?: string;

  @IsOptional()
  @IsBoolean()
  applyStrikeToTargetAuthor?: boolean;
}
