import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsIn(['BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'PHOTO', 'ARCHIVE_RECORD', 'PASSPORT', 'MILITARY_RECORD', 'OTHER'])
  documentType!: 'BIRTH_CERTIFICATE' | 'DEATH_CERTIFICATE' | 'MARRIAGE_CERTIFICATE' | 'PHOTO' | 'ARCHIVE_RECORD' | 'PASSPORT' | 'MILITARY_RECORD' | 'OTHER';

  @IsString()
  mimeType!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  bucket!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ocrText?: string;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
