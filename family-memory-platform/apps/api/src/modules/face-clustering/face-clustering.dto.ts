import { IsOptional, IsString, IsArray } from 'class-validator';

export class AssignClusterPersonDto {
  @IsString()
  personId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  embeddingIds?: string[];
}

export class MergeClustersDto {
  @IsString()
  targetClusterId!: string;
}

export class SplitClusterDto {
  @IsArray()
  @IsString({ each: true })
  embeddingIds!: string[];
}
