import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import type { SubscriptionPlanCode } from '@family/shared';

export class ChangePlanDto {
  @IsEnum(['FREE', 'FAMILY', 'RESEARCHER', 'PROFESSIONAL', 'ON_PREM'])
  planCode!: SubscriptionPlanCode;
}

export class UpdateBillingEmailDto {
  @IsEmail()
  billingEmail!: string;
}

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(['OWNER', 'EDITOR', 'VIEWER'])
  role?: 'OWNER' | 'EDITOR' | 'VIEWER';
}

export class AcceptInviteDto {
  @IsString()
  token!: string;
}

export class UpdateConsentDto {
  @IsBoolean()
  matchProfileOptIn!: boolean;
}

export class GedcomExportQueryDto {
  @IsString()
  familyId!: string;
}
