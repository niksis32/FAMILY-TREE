import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectFamilyStoryDto {
  @IsString()
  @MaxLength(500)
  moderationNote!: string;
}

export class ApproveFamilyStoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderationNote?: string;
}
