import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { ExternalArchiveProviderId } from '@family/shared';

export class ExternalArchiveSearchDto {
  @IsEnum(['FAMILYSEARCH'])
  provider!: ExternalArchiveProviderId;

  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsInt()
  @Min(1500)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1500)
  @Max(2100)
  deathYear?: number;

  @IsOptional()
  @IsString()
  place?: string;

  @IsOptional()
  @IsString()
  recordType?: string;
}

export class ImportExternalRecordDto {
  @IsEnum(['FAMILYSEARCH'])
  provider!: ExternalArchiveProviderId;

  @IsString()
  @MinLength(1)
  recordId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
