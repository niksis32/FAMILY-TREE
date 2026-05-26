import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import type { TreeScopeMode } from '@family/shared';

export class MapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(2100)
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(2100)
  yearTo?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHistoricalNames?: boolean;

  @IsOptional()
  @IsIn(['ancestors', 'descendants', 'full'])
  scope?: TreeScopeMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  depth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  generationMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  generationMax?: number;
}

export class MigrationPathQueryDto extends MapQueryDto {
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? String(value).split(',') : []))
  @IsArray()
  @IsString({ each: true })
  personIds!: string[];
}
