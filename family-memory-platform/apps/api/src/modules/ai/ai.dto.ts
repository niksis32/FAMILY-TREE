import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class OcrPreviewDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @IsOptional()
  @IsString()
  textHint?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class RelationshipSuggestDto {
  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsArray()
  candidates?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  context?: string;
}

export class TimelineSummaryDto {
  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsArray()
  events?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  language?: string;
}

export class AiProxyPayloadDto {
  @IsObject()
  payload!: Record<string, unknown>;
}

export class PhotoDetectFacesDto {
  @IsString()
  mediaId!: string;

  @IsString()
  imageUrl!: string;
}

export class PhotoSuggestPersonDto {
  @IsString()
  mediaId!: string;

  @IsOptional()
  @IsString()
  faceTagId?: string;

  @IsOptional()
  @IsNumber()
  photoYear?: number;

  @IsArray()
  candidates!: Array<Record<string, unknown>>;
}

export class PhotoImageContextDto {
  @IsString()
  mediaId!: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  takenAt?: string;
}
