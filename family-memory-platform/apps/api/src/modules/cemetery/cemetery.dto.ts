import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCemeteryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCemeteryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBurialSiteDto {
  @IsString()
  cemeteryId!: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  plotLabel?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  burialDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBurialSiteDto {
  @IsOptional()
  @IsString()
  personId?: string | null;

  @IsOptional()
  @IsString()
  plotLabel?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  burialDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMemorialDto {
  @IsString()
  burialSiteId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  inscription?: string;

  @IsOptional()
  @IsString()
  photoMediaId?: string;
}

export class UpdateMemorialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  inscription?: string;

  @IsOptional()
  @IsString()
  photoMediaId?: string | null;
}

export class PlanCemeteryRouteDto {
  @IsArray()
  @IsString({ each: true })
  burialSiteIds!: string[];
}

export class AnalyzeTombstonePhotoDto {
  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class RequestPhotogrammetryDto {
  @IsOptional()
  @IsString()
  sourceMediaId?: string;
}
