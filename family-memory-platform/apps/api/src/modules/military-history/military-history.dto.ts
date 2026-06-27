import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Safe printable conflict title — letters, numbers, common punctuation only. */
const CONFLICT_NAME_PATTERN = /^[\p{L}\p{N}\s.,\-–—()'"/]+$/u;

export class CreateMilitaryConflictDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(CONFLICT_NAME_PATTERN, {
    message: 'name must contain only letters, numbers, and safe punctuation',
  })
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex value like #aabbcc' })
  color?: string;
}

export class ApproveMilitaryConflictDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(CONFLICT_NAME_PATTERN, {
    message: 'name must contain only letters, numbers, and safe punctuation',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex value like #aabbcc' })
  color?: string;
}
