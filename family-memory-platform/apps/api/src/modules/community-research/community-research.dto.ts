import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ResearchRequestStatus } from '@prisma/client';

export class CreateResearchRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  surname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  period?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  description!: string;
}

export class UpdateResearchRequestStatusDto {
  @IsEnum(ResearchRequestStatus)
  status!: ResearchRequestStatus;
}

export class UpsertResearcherProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  isPublic?: boolean;
}
