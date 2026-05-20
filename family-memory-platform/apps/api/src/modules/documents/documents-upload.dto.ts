import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export class CreateDocumentUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_FILE_SIZE_BYTES)
  sizeBytes!: number;
}
