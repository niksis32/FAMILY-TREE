import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestStoryTranslationDto {
  @IsString()
  @MaxLength(10)
  targetLocale!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sourceLocale?: string;
}
