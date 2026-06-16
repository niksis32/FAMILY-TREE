import { IsOptional, IsString, IsArray } from 'class-validator';

export class AssignClusterPersonDto {
  @IsString()
  personId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  embeddingIds?: string[];
}
