import { IsOptional, IsString } from 'class-validator';

export class ExtractEntitiesDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
