import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import type { SearchFilters } from '@family/shared';

export class SearchQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearTo?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  familyId?: string;

  @IsOptional()
  @IsString()
  sort?: 'relevance' | 'year_asc' | 'year_desc' | 'title';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class CreateSavedSearchDto {
  @IsString()
  name!: string;

  @IsString()
  query!: string;

  @IsOptional()
  @IsObject()
  filters?: SearchFilters;
}

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  filters?: SearchFilters;
}
