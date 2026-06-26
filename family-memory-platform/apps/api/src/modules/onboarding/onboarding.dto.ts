import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateOnboardingProgressDto {
  @IsOptional()
  @IsString()
  currentStep?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  completeStep?: boolean;

  @IsOptional()
  @IsBoolean()
  skipStep?: boolean;

  @IsOptional()
  @IsBoolean()
  markCompleted?: boolean;
}
