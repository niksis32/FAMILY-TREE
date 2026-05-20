import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'audio/mpeg',
] as const;

export const MAX_MEDIA_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export class CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsIn(ALLOWED_MEDIA_MIME_TYPES)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_MEDIA_FILE_SIZE_BYTES)
  sizeBytes!: number;
}

export class CreateMediaMetadataDto extends CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  personId?: string;
}

export class LinkMediaDto {
  @IsIn(['person', 'family', 'event', 'document', 'source'])
  entityType!: 'person' | 'family' | 'event' | 'document' | 'source';

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
