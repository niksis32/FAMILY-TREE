import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class AskArchiveDto {
  @IsString()
  @MaxLength(2000)
  question!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  limit?: number;
}
