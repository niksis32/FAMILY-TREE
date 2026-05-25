import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { TreeLineageFilter, TreeScopeMode } from '@family/shared';

export class TreeViewDataQueryDto {
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

  @IsOptional()
  @IsIn(['both', 'paternal', 'maternal'])
  lineage?: TreeLineageFilter;

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
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  surname?: string;
}
