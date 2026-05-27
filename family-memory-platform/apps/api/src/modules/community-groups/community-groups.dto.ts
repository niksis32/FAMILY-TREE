import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CommunityGroupType, CommunityGroupVisibility } from '@prisma/client';

export class CreateCommunityGroupDto {
  @IsEnum(CommunityGroupType)
  type!: CommunityGroupType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsEnum(CommunityGroupVisibility)
  visibility?: CommunityGroupVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  regionLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  countryCode?: string;

  @IsOptional()
  periodFrom?: number;

  @IsOptional()
  periodTo?: number;
}

export class ListCommunityGroupsQueryDto {
  @IsOptional()
  @IsEnum(CommunityGroupType)
  type?: CommunityGroupType;

  @IsOptional()
  @IsString()
  q?: string;
}
