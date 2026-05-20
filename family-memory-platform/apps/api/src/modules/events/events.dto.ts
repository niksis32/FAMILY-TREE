import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsIn(['BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'BURIAL', 'RESIDENCE', 'MIGRATION', 'EDUCATION', 'MILITARY', 'WORK', 'OCCUPATION', 'IMMIGRATION', 'CUSTOM'])
  type!: 'BIRTH' | 'DEATH' | 'MARRIAGE' | 'DIVORCE' | 'BURIAL' | 'RESIDENCE' | 'MIGRATION' | 'EDUCATION' | 'MILITARY' | 'WORK' | 'OCCUPATION' | 'IMMIGRATION' | 'CUSTOM';

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  familyId?: string;

  @IsOptional()
  @IsString()
  placeId?: string;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}
