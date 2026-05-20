import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @MinLength(1)
  givenName!: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsDateString()
  deathDate?: string;

  @IsOptional()
  @IsBoolean()
  isLiving?: boolean;

  @IsOptional()
  @IsIn(['PUBLIC', 'FAMILY', 'PRIVATE'])
  privacyLevel?: 'PUBLIC' | 'FAMILY' | 'PRIVATE';

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  avatarMediaId?: string;
}

export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
