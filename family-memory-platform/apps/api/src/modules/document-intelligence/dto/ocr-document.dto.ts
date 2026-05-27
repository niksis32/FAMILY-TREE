import { IsOptional, IsString } from 'class-validator';

export class OcrDocumentDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
