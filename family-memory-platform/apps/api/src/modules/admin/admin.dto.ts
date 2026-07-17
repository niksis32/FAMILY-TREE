import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const USER_ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/** Two-step delete: email must match target user; phrase must be DELETE. */
export class AdminSoftDeleteUserDto {
  @IsEmail()
  confirmEmail!: string;

  @IsString()
  @IsNotEmpty()
  confirmPhrase!: string;
}

export class AdminRevokeSessionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminHideMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class AdminResolveMessageReportDto {
  @IsIn(['RESOLVED', 'DISMISSED', 'UNDER_REVIEW'])
  status!: 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  moderatorNote?: string;

  @IsOptional()
  @IsBoolean()
  hideMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  applySendBlock?: boolean;

  @IsOptional()
  @IsIn(['PLATFORM', 'WORKSPACE'])
  blockScope?: 'PLATFORM' | 'WORKSPACE';

  @IsOptional()
  @IsString()
  blockExpiresAt?: string;
}

export class AdminUpsertGlobalFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class AdminUpdatePortalSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  portalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  tagline?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string | null;

  @IsOptional()
  landingCopy?: Record<string, { heroTitle?: string; heroSubtitle?: string; ctaLabel?: string }>;

  @IsOptional()
  modules?: Record<string, boolean>;

  @IsOptional()
  @IsIn(['ru', 'en'])
  defaultLocale?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceMessage?: string | null;
}

export class AdminUpdateWorkspaceBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string | null;
}

export class AdminApplyMessengerSanctionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
