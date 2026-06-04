import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModeratePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  moderatorNote?: string;

  @IsOptional()
  @IsBoolean()
  applyStrikeToAuthor?: boolean;
}
