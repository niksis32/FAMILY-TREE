import { IsOptional, IsString } from 'class-validator';

export class CreateMemoryStoryDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  subjectPersonId!: string;

  @IsOptional()
  @IsString()
  narratorPersonId?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateMemoryStoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subjectPersonId?: string;

  @IsOptional()
  @IsString()
  recordedAt?: string;
}

export class UpdateTranscriptDto {
  @IsString()
  text!: string;

  @IsOptional()
  segments?: unknown;
}
