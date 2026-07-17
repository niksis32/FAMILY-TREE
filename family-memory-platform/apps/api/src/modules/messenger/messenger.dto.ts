import { IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ModerationReportCategory } from '@prisma/client';

export class CreateDirectConversationDto {
  @IsString()
  participantUserId!: string;
}

export class CreateGroupConversationDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsArray()
  @IsString({ each: true })
  participantUserIds!: string[];
}

export class CreateContextConversationDto {
  @IsIn(['PERSON', 'FAMILY', 'EVENT', 'MATCH'])
  contextType!: 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH';

  @IsString()
  contextId!: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentMediaIds?: string[];
}

export class ReportMessageDto {
  @IsEnum(ModerationReportCategory)
  category!: ModerationReportCategory;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}
