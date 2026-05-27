import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ForumAttachmentRefDto {
  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class CreateForumThreadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class CreateForumPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForumAttachmentRefDto)
  @ArrayMaxSize(20)
  attachments?: ForumAttachmentRefDto[];

  @IsOptional()
  @IsBoolean()
  referencesLivingPersonData?: boolean;

  @IsOptional()
  @IsBoolean()
  hasConsentForPublicLivingData?: boolean;
}

export class ForumPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  take?: number;
}
