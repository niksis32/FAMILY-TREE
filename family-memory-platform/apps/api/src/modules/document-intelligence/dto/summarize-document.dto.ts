import { IsOptional, IsString } from 'class-validator';

export class SummarizeDocumentDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
