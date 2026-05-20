import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

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
  textHint?: string;
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
