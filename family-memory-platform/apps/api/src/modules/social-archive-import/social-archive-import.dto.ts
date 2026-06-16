import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ManifestItemDto {
  @IsString()
  externalId!: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  takenAt?: string;

  @IsOptional()
  @IsString()
  stagingMediaKey?: string;

  @IsOptional()
  @IsArray()
  privacyFlags?: string[];
}

export class CreateSocialImportDto {
  @IsString()
  fileName!: string;

  @IsOptional()
  @IsString()
  stagingKey?: string;

  @IsOptional()
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManifestItemDto)
  manifestItems?: ManifestItemDto[];
}

export class UpdateSocialImportSelectionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];

  @IsOptional()
  @IsBoolean()
  selected?: boolean;

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}

export class ConfirmSocialImportDto {
  @IsOptional()
  @IsString()
  defaultPersonId?: string;

  @IsOptional()
  @IsString()
  privacyLevel?: 'PRIVATE' | 'FAMILY' | 'PUBLIC';
}
