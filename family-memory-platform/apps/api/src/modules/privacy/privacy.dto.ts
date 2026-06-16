import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePersonPrivacyDto {
  @IsOptional()
  @IsIn(['PUBLIC', 'FAMILY', 'PRIVATE'])
  privacyLevel?: 'PUBLIC' | 'FAMILY' | 'PRIVATE';

  @IsOptional()
  @IsBoolean()
  isLiving?: boolean;
}

export class UpdateTreePrivacyDto {
  @IsOptional()
  @IsBoolean()
  hideLivingPersons?: boolean;

  @IsOptional()
  @IsIn(['PUBLIC', 'FAMILY', 'PRIVATE'])
  treePrivacyLevel?: 'PUBLIC' | 'FAMILY' | 'PRIVATE';
}

export class UpdateUserConsentDto {
  @IsIn(['GDPR_DATA_PROCESSING', 'GLOBAL_MATCHING', 'AI_LOCAL_PROCESSING', 'DNA_DATA_IMPORT'])
  consentKey!: 'GDPR_DATA_PROCESSING' | 'GLOBAL_MATCHING' | 'AI_LOCAL_PROCESSING' | 'DNA_DATA_IMPORT';

  @IsBoolean()
  granted!: boolean;
}

export class CreatePublicShareDto {
  @IsIn(['PERSON', 'FAMILY_TREE', 'MEDIA_BUNDLE', 'FAMILY_STORY'])
  resourceType!: 'PERSON' | 'FAMILY_TREE' | 'MEDIA_BUNDLE' | 'FAMILY_STORY';

  @IsString()
  @MinLength(1)
  resourceId!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  hideLivingPersons?: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  familyStoryId?: string;

  /** ISO-8601; omit for default TTL (90 days) */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  neverExpires?: boolean;
}
