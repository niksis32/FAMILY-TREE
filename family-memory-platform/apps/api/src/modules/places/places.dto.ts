import { PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  geoCountryId?: string;

  @IsOptional()
  @IsString()
  geoRegionId?: string;

  @IsOptional()
  @IsString()
  geoCityId?: string;
}

export class UpdatePlaceDto extends PartialType(CreatePlaceDto) {}
